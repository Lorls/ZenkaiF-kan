export const ROLES = [
  'VISITEUR',
  'MEMBRE_SHOMU',
  'MEMBRE_KOBO',
  'RESPONSABLE_SHOMU',
  'RESPONSABLE_KOBO',
  'GERANT',
] as const

export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<Role, string> = {
  VISITEUR: 'Visiteur',
  MEMBRE_SHOMU: 'Membre - Shomu',
  MEMBRE_KOBO: 'Membre - Kobo',
  RESPONSABLE_SHOMU: 'Responsable - Shomu',
  RESPONSABLE_KOBO: 'Responsable - Kobo',
  GERANT: 'Gérant',
}

export type Permission =
  | 'ninjas:read'
  | 'ninjas:write'
  | 'rachat:read'
  | 'rachat:write'
  | 'logs:read'
  | 'logs:revert'
  | 'kobo:read'
  | 'settings:write'
  | 'admin:manage'
  | 'rapports:write'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VISITEUR: [],
  MEMBRE_SHOMU:      ['ninjas:read', 'ninjas:write', 'rachat:read', 'rapports:write'],
  MEMBRE_KOBO:       ['kobo:read', 'rapports:write'],
  RESPONSABLE_SHOMU: ['ninjas:read', 'ninjas:write', 'rachat:read', 'rachat:write', 'logs:read', 'rapports:write'],
  RESPONSABLE_KOBO:  ['kobo:read', 'logs:read', 'rapports:write'],
  GERANT:            ['ninjas:read', 'ninjas:write', 'rachat:read', 'rachat:write', 'logs:read', 'logs:revert', 'kobo:read', 'settings:write', 'admin:manage', 'rapports:write'],
}

export function can(role: string, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(permission)
}
