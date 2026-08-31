// artifacts/rehab-db/src/lib/dataContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import { db, AuditLog } from './db';
import type { Beneficiary, Session, User, Alert, Assessment } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

type QueueAction = 'addBeneficiary' | 'updateBeneficiary' | 'deleteBeneficiary'
                 | 'addSession'     | 'updateSession'     | 'deleteSession'
                 | 'addUser'        | 'updateUser'        | 'deleteUser'
                 | 'addAlert'       | 'resolveAlert'
                 | 'addAssessment';

interface QueueItem {
  id: string;
  action: QueueAction;
  payload: any;
  /** Failed attempts. An item that keeps failing is a data problem, not a network one. */
  attempts?: number;
  lastError?: string;
}

/** After this many failures an item is reported instead of retried in silence. */
const MAX_ATTEMPTS = 5;

const QUEUE_KEY = 'rehab-offline-queue';
function loadQueue(): QueueItem[] { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } }
function saveQueue(q: QueueItem[]) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
function pushToQueue(item: Omit<QueueItem, 'id'>) {
  const q = loadQueue();
  q.push({ ...item, id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2) });
  saveQueue(q);
}

interface DataContextType {
  beneficiaries:     Beneficiary[];
  sessions:          Session[];
  users:             User[];
  alerts:            Alert[];
  assessments:       Assessment[];
  auditLogs:         AuditLog[];
  isLoading:         boolean;
  isOnline:          boolean;
  /** Browser is connected AND the API answered. False = nothing is reaching the server. */
  backendReachable:  boolean;
  lastSyncAt:        string | null;
  pendingCount:      number;
  addBeneficiary:    (b: Beneficiary) => Promise<void>;
  updateBeneficiary: (b: Beneficiary) => Promise<void>;
  deleteBeneficiary: (id: string) => Promise<void>;
  addSession:        (s: Session) => Promise<void>;
  updateSession:     (s: Session) => Promise<void>;
  deleteSession:     (id: string) => Promise<void>;
  addUser:           (u: User) => Promise<void>;
  updateUser:        (u: User) => Promise<void>;
  deleteUser:        (id: string, withData?: boolean) => Promise<void>;
  addAlert:          (a: Alert) => Promise<void>;
  resolveAlert:      (id: string, resolvedBy: string) => Promise<void>;
  addAssessment:     (a: Assessment) => Promise<void>;
  getAssessments:    (beneficiaryId: string) => Promise<Assessment[]>;
  addAuditLog:       (log: Omit<AuditLog, 'id'>) => Promise<void>;
  syncNow:           () => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [sessions,      setSessions]      = useState<Session[]>([]);
  const [users,         setUsers]         = useState<User[]>([]);
  const [alerts,        setAlerts]        = useState<Alert[]>([]);
  const [assessments,   setAssessments]   = useState<Assessment[]>([]);
  const [auditLogs,     setAuditLogs]     = useState<AuditLog[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [backendReachable, setBackendReachable] = useState(true);
  const [lastSyncAt,    setLastSyncAt]    = useState<string | null>(null);
  const [pendingCount,  setPendingCount]  = useState(() => loadQueue().length);

  const { toast } = useToast();
  const isSyncing = useRef(false);
  const refreshPendingCount = () => setPendingCount(loadQueue().length);

  const flushQueue = useCallback(async () => {
    if (isSyncing.current) return;
    const q = loadQueue();
    if (q.length === 0) return;
    isSyncing.current = true;
    const succeeded: string[] = [];
    const failed = new Map<string, string>();
    for (const item of q) {
      // A record that has failed this often will not start working on the next
      // pass. Leave it queued so it can be looked at, and move on -- it used to
      // sit at the head of the queue and block everything behind it.
      if ((item.attempts ?? 0) >= MAX_ATTEMPTS) continue;
      try {
        switch (item.action) {
          case 'addBeneficiary':    await api.addBeneficiary(item.payload);    break;
          case 'updateBeneficiary': await api.updateBeneficiary(item.payload); break;
          case 'deleteBeneficiary': await api.deleteBeneficiary(item.payload); break;
          case 'addSession':        await api.addSession(item.payload);        break;
          case 'updateSession':     await api.updateSession(item.payload);     break;
          case 'deleteSession':     await api.deleteSession(item.payload);     break;
          case 'addUser':           await api.addUser(item.payload);           break;
          case 'updateUser':        await api.updateUser(item.payload);        break;
          case 'deleteUser':        await api.deleteUser(item.payload);        break;
          case 'addAlert':          await api.addAlert(item.payload);          break;
          case 'resolveAlert':      await api.resolveAlert(item.payload.id, item.payload.resolvedBy); break;
          case 'addAssessment':     await api.addAssessment(item.payload);     break;
        }
        succeeded.push(item.id);
      } catch (e) {
        console.warn('Queue flush error:', e);
        failed.set(item.id, e instanceof Error ? e.message : String(e));
        // The connection dropping mid-run says nothing about the remaining
        // items, and hammering them would only burn battery. Anything else is
        // this record's own problem, so skip it and keep going.
        if (!navigator.onLine) break;
      }
    }

    const remaining = loadQueue()
      .filter(i => !succeeded.includes(i.id))
      .map(i => failed.has(i.id)
        ? { ...i, attempts: (i.attempts ?? 0) + 1, lastError: failed.get(i.id) }
        : i);
    saveQueue(remaining);
    refreshPendingCount();

    const stuck = remaining.filter(i => (i.attempts ?? 0) >= MAX_ATTEMPTS).length;
    if (succeeded.length > 0) {
      toast({
        title: `✅ تمت مزامنة ${succeeded.length} ${succeeded.length === 1 ? 'سجل' : 'سجلات'} بنجاح`,
        description: remaining.length > 0 ? `تبقّى ${remaining.length} في الانتظار` : 'جميع البيانات محفوظة على السيرفر',
      });
    }
    if (stuck > 0) {
      toast({
        variant: 'destructive',
        title: `${stuck} ${stuck === 1 ? 'سجل' : 'سجلات'} تعذّرت مزامنتها`,
        description: 'حاول النظام مراراً دون نجاح. يرجى إبلاغ مدير النظام قبل مسح بيانات المتصفح.',
      });
    }
    isSyncing.current = false;
  }, [toast]);

  useEffect(() => {
    const goOnline = async () => { setIsOnline(true); await flushQueue(); await syncNow(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [flushQueue]);

  const loadFromDexie = async () => {
    try {
      const [bens, sess, usrs, alts, logs] = await Promise.all([
        db.beneficiaries.toArray(), db.sessions.toArray(), db.users.toArray(),
        db.alerts.toArray(), db.auditLogs.orderBy('timestamp').reverse().limit(500).toArray(),
      ]);
      setBeneficiaries(bens as Beneficiary[]); setSessions(sess as Session[]);
      setUsers(usrs as User[]); setAlerts(alts as Alert[]); setAuditLogs(logs as AuditLog[]);
    } catch {}
  };

  const cacheInDexie = async (bens: Beneficiary[], sess: Session[], usrs: User[], alts: Alert[]) => {
    try {
      await db.transaction('rw', db.beneficiaries, db.sessions, db.users, db.alerts, async () => {
        await db.beneficiaries.clear(); await db.beneficiaries.bulkPut(bens as any);
        await db.sessions.clear();      await db.sessions.bulkPut(sess as any);
        await db.users.clear();         await db.users.bulkPut(usrs as any);
        await db.alerts.clear();        await db.alerts.bulkPut(alts as any);
      });
    } catch (e) { console.warn('Dexie cache error:', e); }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        await flushQueue();
        const [bens, sess, usrs, alts] = await Promise.all([
          api.getBeneficiaries(), api.getSessions(), api.getUsers(), api.getAlerts(),
        ]);
        setBeneficiaries(bens); setSessions(sess); setUsers(usrs); setAlerts(alts);
        setLastSyncAt(new Date().toLocaleTimeString('ar'));
        setBackendReachable(true);
        await cacheInDexie(bens, sess, usrs, alts);
        const logs = await db.auditLogs.orderBy('timestamp').reverse().limit(500).toArray();
        setAuditLogs(logs as AuditLog[]);
      } else { await loadFromDexie(); }
    } catch (err) {
      console.error('Error loading data:', err);
      setBackendReachable(false);
      await loadFromDexie();
    }
    finally { setIsLoading(false); }
  }, [flushQueue]);

  useEffect(() => { loadData(); }, [loadData]);

  const syncNow = useCallback(async () => {
    try {
      const [bens, sess, usrs, alts] = await Promise.all([
        api.getBeneficiaries(), api.getSessions(), api.getUsers(), api.getAlerts(),
      ]);
      setBeneficiaries(bens); setSessions(sess); setUsers(usrs); setAlerts(alts);
      setLastSyncAt(new Date().toLocaleTimeString('ar'));
      setBackendReachable(true);
      await cacheInDexie(bens, sess, usrs, alts);
    } catch (e) { console.error('Sync error:', e); setBackendReachable(false); }
  }, []);

  const addAuditLog = async (log: Omit<AuditLog, 'id'>) => {
    const entry: AuditLog = { ...log, id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2) };
    await db.auditLogs.add(entry).catch(() => {});
    setAuditLogs(prev => [entry, ...prev].slice(0, 500));
  };

  const saveLocal = async (action: QueueAction, payload: any) => { pushToQueue({ action, payload }); refreshPendingCount(); };

  // ─── Beneficiaries ────────────────────────────────────
  const addBeneficiary = async (b: Beneficiary) => {
    await db.beneficiaries.put(b as any).catch(() => {});
    setBeneficiaries(prev => [b, ...prev]);
    if (navigator.onLine) { try { await api.addBeneficiary(b); } catch { await saveLocal('addBeneficiary', b); } }
    else { await saveLocal('addBeneficiary', b); }
  };
  const updateBeneficiary = async (b: Beneficiary) => {
    await db.beneficiaries.put(b as any).catch(() => {});
    setBeneficiaries(prev => prev.map(x => x.id === b.id ? b : x));
    if (navigator.onLine) { try { await api.updateBeneficiary(b); } catch { await saveLocal('updateBeneficiary', b); } }
    else { await saveLocal('updateBeneficiary', b); }
  };
  const deleteBeneficiary = async (id: string) => {
    await db.beneficiaries.delete(id).catch(() => {});
    setBeneficiaries(prev => prev.filter(x => x.id !== id));
    setSessions(prev => prev.filter(s => s.beneficiaryId !== id));
    setAlerts(prev => prev.filter(a => a.beneficiaryId !== id));
    setAssessments(prev => prev.filter(a => a.beneficiaryId !== id));
    if (navigator.onLine) { try { await api.deleteBeneficiary(id); } catch { await saveLocal('deleteBeneficiary', id); } }
    else { await saveLocal('deleteBeneficiary', id); }
  };

  // ─── Sessions ─────────────────────────────────────────
  const addSession = async (s: Session) => {
    await db.sessions.put(s as any).catch(() => {});
    setSessions(prev => [s, ...prev]);
    if (navigator.onLine) { try { await api.addSession(s); } catch { await saveLocal('addSession', s); } }
    else { await saveLocal('addSession', s); }
  };
  const updateSession = async (s: Session) => {
    await db.sessions.put(s as any).catch(() => {});
    setSessions(prev => prev.map(x => x.id === s.id ? s : x));
    if (navigator.onLine) { try { await api.updateSession(s); } catch { await saveLocal('updateSession', s); } }
    else { await saveLocal('updateSession', s); }
  };
  const deleteSession = async (id: string) => {
    await db.sessions.delete(id).catch(() => {});
    setSessions(prev => prev.filter(x => x.id !== id));
    if (navigator.onLine) { try { await api.deleteSession(id); } catch { await saveLocal('deleteSession', id); } }
    else { await saveLocal('deleteSession', id); }
  };

  // ─── Users ────────────────────────────────────────────
  const addUser = async (u: User) => {
    await db.users.put(u as any).catch(() => {});
    setUsers(prev => [...prev, u]);
    if (navigator.onLine) { try { await api.addUser(u); } catch { await saveLocal('addUser', u); } }
    else { await saveLocal('addUser', u); }
  };
  const updateUser = async (u: User) => {
    await db.users.put(u as any).catch(() => {});
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    if (navigator.onLine) { try { await api.updateUser(u); } catch { await saveLocal('updateUser', u); } }
    else { await saveLocal('updateUser', u); }
  };
  const deleteUser = async (id: string, withData = false) => {
    await db.users.delete(id).catch(() => {});
    setUsers(prev => prev.filter(x => x.id !== id));
    if (withData) {
      const userSessionIds = sessions.filter(s => s.createdBy === id).map(s => s.id);
      for (const sid of userSessionIds) { await db.sessions.delete(sid).catch(() => {}); }
      setSessions(prev => prev.filter(s => s.createdBy !== id));
      if (navigator.onLine) { for (const sid of userSessionIds) { try { await api.deleteSession(sid); } catch {} } }
    }
    if (navigator.onLine) { try { await api.deleteUser(id); } catch { await saveLocal('deleteUser', id); } }
    else { await saveLocal('deleteUser', id); }
  };

  // ─── Alerts ───────────────────────────────────────────
  const addAlert = async (a: Alert) => {
    await db.alerts.put(a as any).catch(() => {});
    setAlerts(prev => [a, ...prev]);
    if (navigator.onLine) { try { await api.addAlert(a); } catch { await saveLocal('addAlert', a); } }
    else { await saveLocal('addAlert', a); }
  };
  const resolveAlert = async (id: string, resolvedBy: string) => {
    await db.alerts.update(id, { isResolved: true, resolvedBy } as any).catch(() => {});
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isResolved: true, resolvedBy } : a));
    if (navigator.onLine) { try { await api.resolveAlert(id, resolvedBy); } catch { await saveLocal('resolveAlert', { id, resolvedBy }); } }
    else { await saveLocal('resolveAlert', { id, resolvedBy }); }
  };

  // ─── Assessments ──────────────────────────────────────
  const addAssessment = async (a: Assessment) => {
    setAssessments(prev => [a, ...prev]);
    if (navigator.onLine) { try { await api.addAssessment(a); } catch { await saveLocal('addAssessment', a); } }
    else { await saveLocal('addAssessment', a); }
  };

  const getAssessments = async (beneficiaryId: string): Promise<Assessment[]> => {
    const local = assessments.filter(a => a.beneficiaryId === beneficiaryId);
    if (local.length > 0) return local;
    if (navigator.onLine) {
      try {
        const data = await api.getAssessments(beneficiaryId);
        setAssessments(prev => {
          const others = prev.filter(a => a.beneficiaryId !== beneficiaryId);
          return [...others, ...data];
        });
        return data;
      } catch { return []; }
    }
    return [];
  };

  return (
    <DataContext.Provider value={{
      beneficiaries, sessions, users, alerts, assessments, auditLogs,
      isLoading, isOnline, backendReachable, lastSyncAt, pendingCount,
      addBeneficiary, updateBeneficiary, deleteBeneficiary,
      addSession, updateSession, deleteSession,
      addUser, updateUser, deleteUser,
      addAlert, resolveAlert,
      addAssessment, getAssessments,
      addAuditLog,
      syncNow,
    }}>
      {children}
    </DataContext.Provider>
  );
}
