export const RESOURCES = [
  'Bois',
  'Laine',
  'Plastique',
  'Cuivre',
  'Cuir',
  'Fer',
  'Titane',
  'Chakra Métal',
  'T1',
  'T2',
  'T3',
  'T4',
  'Ryo',
  'Jade',
] as const

export type Resource = (typeof RESOURCES)[number]

export const DEFAULT_VALUES: Record<Resource, number> = {
  Bois: 1,
  Laine: 1,
  Plastique: 1,
  Cuivre: 1,
  Cuir: 1,
  Fer: 2,
  Titane: 3,
  'Chakra Métal': 5,
  T1: 10,
  T2: 20,
  T3: 30,
  T4: 50,
  Ryo: 0.01,
  Jade: 1000,
}
