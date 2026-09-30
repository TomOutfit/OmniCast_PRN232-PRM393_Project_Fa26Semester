// ============================================================
// OmniCast - Permission / Role Guards
// Use `can(user, capability, context?)` in components to hide
// buttons or short-circuit actions. The backend is still the
// source of truth — these guards only improve UX.
// ============================================================

import type { Channel, Comment, User, UserRole } from '@/types';
import {
  CAPABILITY_MIN_ROLE,
  type Capability,
} from '@/lib/constants/permissions';

const ROLE_RANK: Record<UserRole, number> = {
  GUEST: 0,
  VIEWER: 1,
  STAFF: 2,
  ADMIN: 3,
};

/** Has this role at least the required minimum? */
export function hasMinimumRole(
  role: UserRole | undefined | null,
  minimum: UserRole,
): boolean {
  if (!role) return minimum === 'GUEST';
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Coarse-grained "can the user perform this capability?" */
export function can(
  user: User | null | undefined,
  capability: Capability,
): boolean {
  const required = CAPABILITY_MIN_ROLE[capability];
  return hasMinimumRole(user?.role, required);
}

// =================================================================
// Contextual / ownership checks
// =================================================================

/** Can the user edit this channel?
 *  - Owners can edit their own channel.
 *  - STAFF/ADMIN can edit any channel.
 */
export function canEditChannel(
  user: User | null | undefined,
  channel: Pick<Channel, 'ownerId'> | null | undefined,
): boolean {
  if (!user) return false;
  if (can(user, 'channel.update')) return true;
  if (channel?.ownerId && user.id === channel.ownerId) return true;
  return false;
}

/** Can the user delete this channel? */
export function canDeleteChannel(
  user: User | null | undefined,
  channel: Pick<Channel, 'ownerId'> | null | undefined,
): boolean {
  if (!user) return false;
  if (can(user, 'channel.delete')) return true;
  // Owners can also delete their own channels.
  if (channel?.ownerId && user.id === channel.ownerId) return true;
  return false;
}

/** Can the user delete this comment? */
export function canDeleteComment(
  user: User | null | undefined,
  comment: Pick<Comment, 'userId'> | null | undefined,
): boolean {
  if (!user || !comment) return false;
  if (can(user, 'comment.delete.any')) return true;
  if (user.id === comment.userId) return true;
  return false;
}

/** Can the user pin comments? */
export function canPinComment(user: User | null | undefined): boolean {
  return can(user, 'comment.pin');
}

/** Can the user run the AI curator? */
export function canRunAiCurator(user: User | null | undefined): boolean {
  return can(user, 'aiCurator.run');
}

/** Can the user approve / reject programs? */
export function canModeratePrograms(user: User | null | undefined): boolean {
  return can(user, 'program.approve');
}

/** Can the user access the admin area? */
export function canAccessAdmin(user: User | null | undefined): boolean {
  return hasMinimumRole(user?.role, 'STAFF');
}

/** Can the user access audit logs? */
export function canViewAuditLogs(user: User | null | undefined): boolean {
  return can(user, 'audit.view');
}

/** Can the user manage other users? */
export function canManageUsers(user: User | null | undefined): boolean {
  return can(user, 'user.update.any');
}

// =================================================================
// Pure helpers (don't depend on a User)
// =================================================================

/** Is `now` within `[start, end]`? ISO strings accepted. */
export function isWithinWindow(
  start: string | Date,
  end: string | Date,
  now: Date = new Date(),
): boolean {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = now.getTime();
  return n >= s && n <= e;
}

/** Has `target` already started relative to `now`? */
export function hasStarted(target: string | Date, now: Date = new Date()): boolean {
  return new Date(target).getTime() <= now.getTime();
}

/** Has `target` already ended relative to `now`? */
export function hasEnded(target: string | Date, now: Date = new Date()): boolean {
  return new Date(target).getTime() <= now.getTime();
}

/** Is the given slug available (kebab-case, doesn't start/end with dash)? */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}

/** Truncate a string to `max` characters with ellipsis. */
export function clampText(s: string | null | undefined, max: number): string {
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}