import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Beneficiary, Session, Alert, UserPermissions, DEFAULT_PERMISSIONS } from '@/data/mockData';
import { db } from './db';
import { encryptedDb } from './encryptedDb';
import { loginWithEdgeFunction, setToken, clearToken } from './api';
import { supabase } from './supabaseClient';
// Moved to its own module so it can be tested without React or Dexie.
// Re-exported here because callers already import it from this file.
import { resolvePermissions } from './permissions';
export { resolvePermissions };

const TIMEOUT_KEY  = 'rehab-session-timeout';
const USER_KEY     = 'rehab-current-user';
const PIN_KEY      = 'rehab-pin-hash';
const PIN_LOCK_KEY = 'rehab-pin-locked';
const DEFAULT_MINS = 30;

function hashPin(pin: string): string {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}


interface AuthContextType {
  currentUser: User | null;
  login:  (username: string, password: string) => Promise<boolean | string>;
  logout: () => void;
  isAuthenticated: boolean;
  sessionTimeoutMins: number | 'never';
  setSessionTimeoutMins: (v: number | 'never') => void;
  pinEnabled: boolean;
  pinLocked: boolean;
  setupPin: (pin: string) => void;
  disablePin: () => void;
  unlockWithPin: (pin: string) => boolean;
  lockNow: () => void;
  permissions: UserPermissions;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  sessionTimeoutMins: DEFAULT_MINS,
  setSessionTimeoutMins: () => {},
  pinEnabled: false,
  pinLocked: false,
  setupPin: () => {},
  disablePin: () => {},
  unlockWithPin: () => false,
  lockNow: () => {},
  permissions: DEFAULT_PERMISSIONS['viewer'],
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [timeoutMins, setTimeoutMins] = useState<number | 'never'>(() => {
    const saved = localStorage.getItem(TIMEOUT_KEY);
    if (!saved) return DEFAULT_MINS;
    return saved === 'never' ? 'never' : Number(saved);
  });
  const [pinEnabled, setPinEnabled] = useState(() => !!localStorage.getItem(PIN_KEY));
  const [pinLocked, setPinLocked]   = useState(() => !!localStorage.getItem(PIN_LOCK_KEY));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const permissions = resolvePermissions(currentUser);

  const refreshCurrentUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return;

      const updatedUser: User = {
        id:          data.id,
        fullName:    data.full_name,
        username:    data.username,
        password:    data.password,
        role:        data.role,
        projects:    data.projects || [],
        status:      data.status,
        permissions: data.permissions || undefined,
      };

      const current = currentUser;
      if (
        current &&
        (
          current.role        !== updatedUser.role   ||
          current.status      !== updatedUser.status ||
          JSON.stringify(current.projects)    !== JSON.stringify(updatedUser.projects)    ||
          JSON.stringify(current.permissions) !== JSON.stringify(updatedUser.permissions)
        )
      ) {
        if (updatedUser.status === 'inactive') {
          doLogout();
          return;
        }
        setCurrentUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        await db.users.put(updatedUser as any).catch(() => {});
      }
    } catch {
      // فشل الاتصال → نكمل طبيعي
    }
  }, [currentUser]);

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        const u = JSON.parse(saved) as User;
        setCurrentUser(u);
        encryptedDb.init(`${u.username}:${u.id}`);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refreshCurrentUser(currentUser.id);
    }, 30_000);
    return () => clearInterval(interval);
  }, [currentUser?.id, refreshCurrentUser]);

  useEffect(() => {
    if (!pinEnabled) return;
    const onVisibility = () => {
      if (document.hidden && currentUser) {
        localStorage.setItem(PIN_LOCK_KEY, '1');
        setPinLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pinEnabled, currentUser]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current)  clearTimeout(warnRef.current);
  }, []);

  const doLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PIN_LOCK_KEY);
    clearToken();
    clearTimers();
    setPinLocked(false);
    encryptedDb.clear();
  }, [clearTimers]);

  const resetTimer = useCallback(() => {
    if (!currentUser || timeoutMins === 'never') return;
    clearTimers();
    const ms     = timeoutMins * 60 * 1000;
    const warnMs = Math.max(0, ms - 2 * 60 * 1000);
    warnRef.current  = setTimeout(() => {
      console.warn('[RehabDB] session expiring in 2 minutes');
    }, warnMs);
    timerRef.current = setTimeout(() => doLogout(), ms);
  }, [currentUser, timeoutMins, clearTimers, doLogout]);

  useEffect(() => {
    if (!currentUser) { clearTimers(); return; }
    resetTimer();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      clearTimers();
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [currentUser, timeoutMins]);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<boolean | string> => {
    try {
      const result = await loginWithEdgeFunction(username, password);
      const { token, user } = result;
      setToken(token);
      const fullUser = user as unknown as User;
      setCurrentUser(fullUser);
      localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
      encryptedDb.init(password);
      return true;
    } catch (err: any) {
      // لو الحساب معطّل — أرجع الرسالة مباشرة
      const msg = err?.message || '';
      if (msg.includes('معطّل') || msg.includes('مدير النظام')) {
        return msg;
      }
    }

    // Offline fallback, limited to users cached by a previous successful
    // server login. It never falls back to the bundled demo accounts: those
    // ship inside the public JS, so anyone reading the page source could have
    // signed in as an administrator.
    const localUsers = await db.users.toArray() as User[];
    if (localUsers.length === 0) {
      return 'تعذّر الاتصال بالخادم، ولا توجد بيانات دخول محفوظة على هذا الجهاز.';
    }
    const user = localUsers.find(u => u.username === username && u.password === password && u.status === 'active');
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      encryptedDb.init(password);
      return true;
    }
    return false;
  };

  // ─── PIN ──────────────────────────────────────────────────────────────────
  const setupPin = (pin: string) => {
    localStorage.setItem(PIN_KEY, hashPin(pin));
    setPinEnabled(true);
    setPinLocked(false);
  };

  const disablePin = () => {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(PIN_LOCK_KEY);
    setPinEnabled(false);
    setPinLocked(false);
  };

  const unlockWithPin = (pin: string): boolean => {
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored) return false;
    if (hashPin(pin) === stored) {
      localStorage.removeItem(PIN_LOCK_KEY);
      setPinLocked(false);
      return true;
    }
    return false;
  };

  const lockNow = () => {
    if (!pinEnabled) return;
    localStorage.setItem(PIN_LOCK_KEY, '1');
    setPinLocked(true);
  };

  const logout = () => doLogout();

  const setSessionTimeoutMins = (v: number | 'never') => {
    setTimeoutMins(v);
    localStorage.setItem(TIMEOUT_KEY, v === 'never' ? 'never' : String(v));
  };

  return (
    <AuthContext.Provider value={{
      currentUser, login, logout, isAuthenticated: !!currentUser,
      sessionTimeoutMins: timeoutMins, setSessionTimeoutMins,
      pinEnabled, pinLocked, setupPin, disablePin, unlockWithPin, lockNow,
      permissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);