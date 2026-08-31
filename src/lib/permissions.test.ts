import { describe, it, expect } from 'vitest';
import { resolvePermissions } from './permissions';
import { DEFAULT_PERMISSIONS, type User, type Role } from '@/data/mockData';

const user = (role: Role, permissions?: User['permissions']): User => ({
  id: 'u1', fullName: 'Test', username: 'test', password: '',
  role, projects: ['CBM'], status: 'active', permissions,
} as User);

describe('resolvePermissions', () => {
  it('gives a signed-out visitor the most restricted role, not an empty object', () => {
    // An empty object would read as false on every boolean check and look
    // safe, while quietly losing allowedServiceTypes.
    expect(resolvePermissions(null)).toEqual(DEFAULT_PERMISSIONS.viewer);
  });

  it('gives each role its default set', () => {
    for (const role of Object.keys(DEFAULT_PERMISSIONS) as Role[]) {
      expect(resolvePermissions(user(role))).toEqual(DEFAULT_PERMISSIONS[role]);
    }
  });

  it('lets an override grant a permission the role does not have', () => {
    expect(DEFAULT_PERMISSIONS.viewer.canAddSession).toBe(false);
    const p = resolvePermissions(user('viewer', { canAddSession: true }));
    expect(p.canAddSession).toBe(true);
  });

  it('lets an override withdraw a permission the role does have', () => {
    expect(DEFAULT_PERMISSIONS.admin.canDeleteSession).toBe(true);
    const p = resolvePermissions(user('admin', { canDeleteSession: false }));
    expect(p.canDeleteSession).toBe(false);
  });

  it('leaves the permissions an override does not mention untouched', () => {
    const p = resolvePermissions(user('data_entry', { canViewReports: true }));
    expect(p.canViewReports).toBe(true);
    expect(p.canAddSession).toBe(DEFAULT_PERMISSIONS.data_entry.canAddSession);
    expect(p.canDeleteSession).toBe(DEFAULT_PERMISSIONS.data_entry.canDeleteSession);
  });

  it('does not let one user\'s overrides leak into the role defaults', () => {
    // The role table is shared by every user, so resolving must copy it.
    resolvePermissions(user('viewer', { canManageUsers: true }));
    expect(DEFAULT_PERMISSIONS.viewer.canManageUsers).toBe(false);
    expect(resolvePermissions(user('viewer')).canManageUsers).toBe(false);
  });

  it('keeps user management to admins by default', () => {
    for (const role of Object.keys(DEFAULT_PERMISSIONS) as Role[]) {
      if (role === 'admin') continue;
      expect(DEFAULT_PERMISSIONS[role].canManageUsers).toBe(false);
    }
  });
});
