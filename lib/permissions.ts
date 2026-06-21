export const ROLES = ['MEMBRE', 'GERANT'] as const

export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<Role, string> = {
  MEMBRE: 'Membre',
  GERANT: 'Gérant',
}

export type Permission = 'admin:manage' | 'gestion:manage'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MEMBRE: [],
  GERANT: ['admin:manage', 'gestion:manage'],
}

export function can(role: string, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(permission)
}
