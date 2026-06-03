import Dexie, { type Table } from 'dexie';
import type { Beneficiary, Session, User, Alert, Attachment } from '@/data/mockData';
import { mockBeneficiaries, mockSessions, mockUsers, mockAlerts } from '@/data/mockData';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'backup' | 'restore' | 'import' | 'export';
  entity: 'beneficiary' | 'session' | 'user' | 'alert' | 'system';
  entityId?: string;
  entityName?: string;
  details?: string;
  timestamp: string;
}

export interface SdqRecord {
  id: string;
  beneficiaryId: string;
  answers: Record<number, string>;
  scores: Record<string, number>;
  totalScore: number;
  completedAt: string;
  completedBy: string;
  completedByName: string;
  notes: string;
}

export class RehabDB extends Dexie {
  beneficiaries!: Table<Beneficiary>;
  sessions!:      Table<Session>;
  users!:         Table<User>;
  alerts!:        Table<Alert>;
  auditLogs!:     Table<AuditLog>;
  attachments!:   Table<Attachment>;
  sdqRecords!:    Table<SdqRecord>;

  constructor() {
    super('RehabDB');
    this.version(1).stores({
      beneficiaries: 'id, nationalId, project, residenceArea, gender, caseStatus',
      sessions:      'id, beneficiaryId, formType, serviceDate, createdBy',
      users:         'id, username, role, status',
      alerts:        'id, beneficiaryId, alertType, priority, isResolved',
    });
    this.version(2).stores({
      beneficiaries: 'id, nationalId, project, residenceArea, gender, caseStatus',
      sessions:      'id, beneficiaryId, formType, serviceDate, createdBy',
      users:         'id, username, role, status',
      alerts:        'id, beneficiaryId, alertType, priority, isResolved',
      auditLogs:     'id, userId, action, entity, timestamp',
    });
    this.version(3).stores({
      beneficiaries: 'id, nationalId, project, residenceArea, gender, caseStatus',
      sessions:      'id, beneficiaryId, formType, serviceDate, createdBy',
      users:         'id, username, role, status',
      alerts:        'id, beneficiaryId, alertType, priority, isResolved',
      auditLogs:     'id, userId, action, entity, timestamp',
      attachments:   'id, beneficiaryId, sessionId, category, uploadedBy, uploadedAt',
    });
    // Version 4: add sdqRecords
    this.version(4).stores({
      beneficiaries: 'id, nationalId, project, residenceArea, gender, caseStatus',
      sessions:      'id, beneficiaryId, formType, serviceDate, createdBy',
      users:         'id, username, role, status',
      alerts:        'id, beneficiaryId, alertType, priority, isResolved',
      auditLogs:     'id, userId, action, entity, timestamp',
      attachments:   'id, beneficiaryId, sessionId, category, uploadedBy, uploadedAt',
      sdqRecords:    'id, beneficiaryId, completedAt, completedBy',
    });
  }
}

export const db = new RehabDB();

db.on('ready', async () => {
  const count = await db.beneficiaries.count();
  if (count === 0) {
    await db.transaction('rw', db.beneficiaries, db.sessions, db.users, db.alerts, async () => {
      await db.beneficiaries.bulkAdd(mockBeneficiaries as Beneficiary[]);
      await db.sessions.bulkAdd(mockSessions as Session[]);
      await db.users.bulkAdd(mockUsers as User[]);
      await db.alerts.bulkAdd(mockAlerts as Alert[]);
    });
  }
});