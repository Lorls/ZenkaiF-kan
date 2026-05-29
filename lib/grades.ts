export const GRADES = [
  { key: 'GC',     label: 'GC',    default: 25 },
  { key: 'Chunin', label: 'C',     default: 50 },
  { key: 'Konin',  label: 'K',     default: 500 },
  { key: 'TKJ',    label: 'TKJ',   default: 1000 },
] as const

export type GradeKey = (typeof GRADES)[number]['key']

export type GradeThresholds = Record<GradeKey, number>

export const DEFAULT_THRESHOLDS: GradeThresholds = {
  GC: 25,
  Chunin: 50,
  Konin: 500,
  TKJ: 1000,
}
