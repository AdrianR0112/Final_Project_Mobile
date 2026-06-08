export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'cliente',
  TECHNICIAN: 'tecnico',
} as const;

export function getAppSegmentByRole(role: string): string | null {
  switch (role) {
    case ROLES.CLIENT:
      return 'client';
    case ROLES.TECHNICIAN:
      return 'technician';
    case ROLES.ADMIN:
      return 'admin';
    default:
      return null;
  }
}

export function getDashboardPathByRole(role: string): string | null {
  const segment = getAppSegmentByRole(role);
  return segment ? `${segment}Dashboard` : null;
}
