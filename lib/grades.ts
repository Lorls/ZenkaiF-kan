export const GRADES = [
  { key: 'GC',     label: 'GC',    default: 25,   taxRyos: 10000 },
  { key: 'Chunin', label: 'C',     default: 50,   taxRyos: 20000 },
  { key: 'Konin',  label: 'K',     default: 500,  taxRyos: 40000 },
  { key: 'TKJ',    label: 'TKJ',   default: 1000, taxRyos: 45000 },
] as const

export type GradeKey = (typeof GRADES)[number]['key']

export type GradeThresholds = Record<GradeKey, number>

export const DEFAULT_THRESHOLDS: GradeThresholds = {
  GC: 25,
  Chunin: 50,
  Konin: 500,
  TKJ: 1000,
}
