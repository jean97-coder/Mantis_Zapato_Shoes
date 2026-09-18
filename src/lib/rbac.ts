import { UserRole } from '../types';

/**
 * SOCIO_ADMIN is the shared login used by all 3 business partners and
 * carries the exact same privileges as ADMIN (the backend's requireRole()
 * normalizes it the same way) — this mirrors that on the frontend so nav
 * visibility and admin-only UI stay in sync with the backend's actual
 * authorization, in one place instead of at every `role === 'ADMIN'` check.
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SOCIO_ADMIN';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SOCIO_ADMIN: 'Socio - Administrador',
  CAJERO: 'Cajero',
  ZAPATERO: 'Zapatero',
};
