import Dexie, { type Table } from 'dexie';
import type { Beneficiary, Session, User, Alert, Attachment } from '@/data/mockData';

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

// Deliberately not seeded. Demo records are indistinguishable from real ones
// once they are on screen, so seeding turned a backend outage into a system
// that looked like it was working and holding six real cases.