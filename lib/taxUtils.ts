import { GRADES, GradeThresholds } from './grades'

const LATE_FEE_PER_MONTH = 2000
export const DEMOTION_THRESHOLD_WEEKS = 104 // ~2 ans

export function getCurrentGradeKey(points: number, thresholds: GradeThresholds): string | null {
  for (let i = GRADES.length - 1; i >= 0; i--) {
    if (points >= thresholds[GRADES[i].key]) return GRADES[i].key
  }
  return null
}

export function getWeeklyTaxRyos(points: number, thresholds: GradeThresholds): number {
  const key = getCurrentGradeKey(points, thresholds)
  if (!key) return 0
  return GRADES.find(g => g.key === key)?.taxRyos ?? 0
}

export function getGradeLabel(points: number, thresholds: GradeThresholds): string {
  const key = getCurrentGradeKey(points, thresholds)
  if (!key) return 'Genin Simple'
  return GRADES.find(g => g.key === key)?.label ?? 'Genin Simple'
}

export function getMonthsLate(weekStart: Date): number {
  const days = (Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(days / 30)
}

export function getLateFeeForWeek(weekStart: Date): number {
  return getMonthsLate(weekStart) * LATE_FEE_PER_MONTH
}

export function getTotalOwed(unpaidWeekStarts: Date[], points: number, thresholds: GradeThresholds): number {
  const base = getWeeklyTaxRyos(points, thresholds)
  if (base === 0) return 0
  return unpaidWeekStarts.reduce((sum, ws) => sum + base + getLateFeeForWeek(ws), 0)
}
