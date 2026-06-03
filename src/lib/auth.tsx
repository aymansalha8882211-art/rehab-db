import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { mockUsers, User, Beneficiary, Session, Alert, UserPermissions, DEFAULT_PERMISSIONS } from '@/data/mockData';
import { db } from './db';
import { encryptedDb } from './encryptedDb';
import { loginWithEdgeFunction, setToken, clearToken } from './api';
import { supabase } from './supabaseClient';



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

// ─── Permission Helper ────────────────────────────────────────────────────────
export function resolvePermissions(user: User | null): UserPermissions {
  if (!user) return DEFAULT_PERMISSIONS['viewer'];
  const base = { ...DEFAULT_PERMISSIONS[user.role] };
  if (user.permissions) {
    return { ...base, ...user.permissions };
  }
  return base;
}

interface AuthContextType {
  currentUser: User | null;
  login:  (username: string, password: string) => Promise<boolean>;
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
  const [dbUsers, setDbUsers]         = useState<User[]>(mockUsers as User[]);
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

  // ─── تحديث بيانات المستخدم من Supabase ───────────────
  // كل 30 ثانية يسأل Supabase عن بيانات المستخدم الحالي
  // لو تغيّرت الصلاحيات أو الدور → يحدّث تلقائياً بدون logout
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

      // لو تغيّر الدور أو الصلاحيات أو الحالة → حدّث
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
        // لو صار inactive → اطرده
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
    db.users.toArray().then(u => { if (u.length > 0) setDbUsers(u as User[]); });
  }, []);

  // فحص دوري كل 30 ثانية لتحديث صلاحيات المستخدم
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
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { token, user } = await loginWithEdgeFunction(username, password);
      setToken(token);
      const fullUser = user as unknown as User;
      setCurrentUser(fullUser);
      localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
      encryptedDb.init(password);

      try {
        const syncData = await api.syncPull();
        if (syncData.beneficiaries.length === 0) {
          const [localBens, localSessions, localAlerts, localUsers] = await Promise.all([
            db.beneficiaries.toArray(),
            db.sessions.toArray(),
            db.alerts.toArray(),
            db.users.toArray(),
          ]);
          if (localBens.length > 0 || localSessions.length > 0) {
            await api.syncPush({ beneficiaries: localBens, sessions: localSessions, alerts: localAlerts, users: localUsers });
          }
        } else {
          await db.transaction('rw', db.beneficiaries, db.sessions, db.users, db.alerts, async () => {
            await db.beneficiaries.clear();
            await db.beneficiaries.bulkPut(syncData.beneficiaries as Beneficiary[]);
            await db.sessions.clear();
            await db.sessions.bulkPut(syncData.sessions as Session[]);
            await db.users.clear();
            await db.users.bulkPut(syncData.users as User[]);
            await db.alerts.clear();
            await db.alerts.bulkPut(syncData.alerts as Alert[]);
          });
        }
      } catch {}
      return true;
    } catch {}

    // Fallback: local Dexie
    const localUsers = await db.users.toArray();
    const pool = localUsers.length > 0 ? localUsers as User[] : dbUsers;
    const user = pool.find(u => u.username === username && u.password === password && u.status === 'active');
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