/**
 * encryptedDb.ts
 * artifacts/rehab-db/src/lib/encryptedDb.ts
 *
 * Transparent encryption layer over Dexie.
 * Sensitive fields are encrypted with AES-GCM 256 before storage.
 * Indexes (id, nationalId, project...) stay plaintext so Dexie can query them.
 * Everything else is encrypted — unreadable without the user password.
 *
 * Usage:
 *   import { encryptedDb } from '@/lib/encryptedDb';
 *   encryptedDb.init(password);          // call once after login
 *   const bens = await encryptedDb.getBeneficiaries();
 *   await encryptedDb.putBeneficiary(ben);
 */

import { db } from './db';
import { encryptData, decryptData } from './crypto';
import type { Beneficiary, Session, Alert, User } from '@/data/mockData';

// ─── Sensitive fields per entity ──────────────────────────────────────────────
// Index fields stay plain (Dexie needs them). Everything else is encrypted.

const BEN_PLAIN  = new Set(['id', 'nationalId', 'project', 'residenceArea', 'gender', 'caseStatus']);
const SES_PLAIN  = new Set(['id', 'beneficiaryId', 'formType', 'serviceDate', 'createdBy']);
const USR_PLAIN  = new Set(['id', 'username', 'role', 'status']);
const ALRT_PLAIN = new Set(['id', 'beneficiaryId', 'alertType', 'priority', 'isResolved']);

// ─── Module state ─────────────────────────────────────────────────────────────
let _password: string | null = null;
let _ready = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Encrypt every field NOT in the plain set */
async function encryptRecord<T extends Record<string, unknown>>(
  record: T,
  plainFields: Set<string>,
): Promise<T> {
  if (!_password) return record; // encryption not active — passthrough
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (plainFields.has(k) || v === undefined || v === null) {
      out[k] = v;
    } else {
      // Serialize then encrypt
      out[k] = '__enc__' + await encryptData(JSON.stringify(v), _password);
    }
  }
  return out as T;
}

/** Decrypt every field that was encrypted (prefixed with __enc__) */
async function decryptRecord<T extends Record<string, unknown>>(
  record: T,
): Promise<T> {
  if (!_password) return record;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (typeof v === 'string' && v.startsWith('__enc__')) {
      try {
        out[k] = JSON.parse(await decryptData(v.slice(7), _password));
      } catch {
        out[k] = null; // wrong password or corrupted
      }
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

async function encryptAll<T extends Record<string, unknown>>(
  records: T[],
  plain: Set<string>,
): Promise<T[]> {
  return Promise.all(records.map(r => encryptRecord(r, plain)));
}

async function decryptAll<T extends Record<string, unknown>>(
  records: T[],
): Promise<T[]> {
  return Promise.all(records.map(r => decryptRecord(r)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const encryptedDb = {
  /**
   * Call this after login with the user's password.
   * All subsequent reads/writes will use this password for encryption.
   */
  init(password: string) {
    _password = password;
    _ready = true;
  },

  clear() {
    _password = null;
    _ready = false;
  },

  get isReady() { return _ready; },

  // ── Beneficiaries ──────────────────────────────────────────────────────────

  async getBeneficiaries(): Promise<Beneficiary[]> {
    const raw = await db.beneficiaries.toArray();
    return decryptAll(raw as unknown as Record<string, unknown>[]) as unknown as Promise<Beneficiary[]>;
  },

  async getBeneficiary(id: string): Promise<Beneficiary | undefined> {
    const raw = await db.beneficiaries.get(id);
    if (!raw) return undefined;
    return decryptRecord(raw as unknown as Record<string, unknown>) as unknown as Promise<Beneficiary>;
  },

  async putBeneficiary(ben: Beneficiary): Promise<void> {
    const enc = await encryptRecord(ben as unknown as Record<string, unknown>, BEN_PLAIN);
    await db.beneficiaries.put(enc as unknown as Beneficiary);
  },

  async deleteBeneficiary(id: string): Promise<void> {
    await db.beneficiaries.delete(id);
  },

  // ── Sessions ───────────────────────────────────────────────────────────────

  async getSessions(): Promise<Session[]> {
    const raw = await db.sessions.toArray();
    return decryptAll(raw as unknown as Record<string, unknown>[]) as unknown as Promise<Session[]>;
  },

  async getSessionsByBeneficiary(beneficiaryId: string): Promise<Session[]> {
    const raw = await db.sessions.where('beneficiaryId').equals(beneficiaryId).toArray();
    return decryptAll(raw as unknown as Record<string, unknown>[]) as unknown as Promise<Session[]>;
  },

  async putSession(session: Session): Promise<void> {
    const enc = await encryptRecord(session as unknown as Record<string, unknown>, SES_PLAIN);
    await db.sessions.put(enc as unknown as Session);
  },

  async deleteSession(id: string): Promise<void> {
    await db.sessions.delete(id);
  },

  // ── Alerts ─────────────────────────────────────────────────────────────────

  async getAlerts(): Promise<Alert[]> {
    const raw = await db.alerts.toArray();
    return decryptAll(raw as unknown as Record<string, unknown>[]) as unknown as Promise<Alert[]>;
  },

  async putAlert(alert: Alert): Promise<void> {
    const enc = await encryptRecord(alert as unknown as Record<string, unknown>, ALRT_PLAIN);
    await db.alerts.put(enc as unknown as Alert);
  },

  async deleteAlert(id: string): Promise<void> {
    await db.alerts.delete(id);
  },

  // ── Users (encrypt password field only) ───────────────────────────────────

  async getUsers(): Promise<User[]> {
    const raw = await db.users.toArray();
    return decryptAll(raw as unknown as Record<string, unknown>[]) as unknown as Promise<User[]>;
  },

  async putUser(user: User): Promise<void> {
    const enc = await encryptRecord(user as unknown as Record<string, unknown>, USR_PLAIN);
    await db.users.put(enc as unknown as User);
  },

  // ── Bulk re-encrypt (call after password change) ───────────────────────────
  /**
   * Re-encrypts all data with a new password.
   * Reads with oldPassword, writes with newPassword.
   */
  async reEncryptAll(oldPassword: string, newPassword: string): Promise<void> {
    // Read everything with old password
    const oldPw = _password;
    _password = oldPassword;

    const [bens, sessions, alerts, users] = await Promise.all([
      this.getBeneficiaries(),
      this.getSessions(),
      this.getAlerts(),
      this.getUsers(),
    ]);

    // Switch to new password and write back
    _password = newPassword;

    await db.transaction('rw', db.beneficiaries, db.sessions, db.alerts, db.users, async () => {
      await db.beneficiaries.clear();
      for (const b of bens) await this.putBeneficiary(b);

      await db.sessions.clear();
      for (const s of sessions) await this.putSession(s);

      await db.alerts.clear();
      for (const a of alerts) await this.putAlert(a);

      await db.users.clear();
      for (const u of users) await this.putUser(u);
    });

    _password = newPassword; // keep new password active
  },
};