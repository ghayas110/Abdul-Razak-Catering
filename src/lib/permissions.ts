import { type Permission, type Role, ROLE_DEFAULTS } from './types';

/**
 * Resolve the effective permission set for a user.
 * If the user has an explicit `permissions` JSON override, that wins;
 * otherwise fall back to the role defaults.
 */
export function resolvePermissions(role: Role, override: string | string[] | null | undefined): Permission[] {
  if (override) {
    const arr = typeof override === 'string' ? safeParse(override) : override;
    if (Array.isArray(arr) && arr.length > 0) return arr as Permission[];
  }
  return ROLE_DEFAULTS[role] ?? [];
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

/** Human-readable label + group for each permission (for the access editor UI). */
export const PERMISSION_META: Record<Permission, { label: string; group: string }> = {
  'catering.view':    { label: 'Open the portal and see quotations', group: 'Catering' },
  'catering.manage':  { label: 'Create & edit quotations, invoices, menu, customers', group: 'Catering' },
  'catering.reports': { label: 'See the ledger, vendor bills and reports', group: 'Money' },
  'leads.view':       { label: 'See website enquiries', group: 'Catering' },
  'users.manage':     { label: 'Manage user accounts and access', group: 'Admin' },
  'settings.manage':  { label: 'Edit the business profile and settings', group: 'Admin' },
};

/**
 * The real permission check — role shortcuts included.
 *
 * A Super Admin holds everything outright, whatever their stored permission
 * list says — that shortcut is what stops an account being locked out of the
 * one screen that could fix it. Everyone else, the Owner included, is judged
 * on their resolved permission list, so revoking a permission from an Owner
 * actually revokes it.
 *
 * Lives here rather than in session.ts so client components (the sidebar, the
 * access editor) can call it without dragging in next-auth server internals.
 */
export function effectiveCan(
  role: Role,
  perms: Permission[] | undefined,
  perm: Permission,
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return can(perms, perm);
}

/** Ranks at or above Owner — the two roles allowed near irreversible actions. */
export function isAdminRole(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'OWNER';
}

export function can(perms: Permission[] | undefined, perm: Permission): boolean {
  return !!perms?.includes(perm);
}

export function canAny(perms: Permission[] | undefined, list: Permission[]): boolean {
  return !!perms && list.some((p) => perms.includes(p));
}
