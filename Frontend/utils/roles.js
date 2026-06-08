export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'cliente',
  TECHNICIAN: 'tecnico',
};

export function getAppSegmentByRole(role) {
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

export function getDashboardPathByRole(role) {
  const segment = getAppSegmentByRole(role);
  return segment ? `/${segment}/dashboard` : '/login';
}
