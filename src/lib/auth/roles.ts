export type LocalAuthRole = 'manager' | 'employee';

export interface LocalAuthIdentity {
  username: string;
  role: LocalAuthRole;
}

export const EMPLOYEE_HOME = '/attendance';

const EMPLOYEE_ROUTES = [
  '/students',
  '/attendance',
  '/progress',
  '/courses',
  '/schedule',
  '/announcements',
  '/portfolio',
  '/supplies',
] as const;

export function canLocalRoleAccessPath(role: LocalAuthRole, pathname: string): boolean {
  if (role === 'manager') return true;
  return EMPLOYEE_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

export function localRoleLabel(role: LocalAuthRole): string {
  return role === 'manager' ? 'مدير المرسم' : 'موظف المرسم';
}
