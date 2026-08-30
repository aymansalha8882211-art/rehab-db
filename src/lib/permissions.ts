/**
 * Resolves what a signed-in member of staff is allowed to do.
 *
 * Lives outside auth.tsx so it can be tested without pulling in React or the
 * Dexie instance that file creates on import. This decides who may close a
 * case or delete a session, so it is worth being able to assert on directly.
 */
import { DEFAULT_PERMISSIONS, type User, type UserPermissions } from '@/data/mockData';

export function resolvePermissions(user: User | null): UserPermissions {
  // No user means no session: fall back to the most restricted role rather
  // than to an empty object, which would read as "false" for every check but
  // would also silently drop allowedServiceTypes.
  if (!user) return DEFAULT_PERMISSIONS['viewer'];

  const base = { ...DEFAULT_PERMISSIONS[user.role] };

  // Per-user overrides are a partial patch over the role default, so an
  // override may only be granted deliberately -- it is never inherited.
  if (user.permissions) {
    return { ...base, ...user.permissions };
  }
  return base;
}
