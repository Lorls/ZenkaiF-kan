import { GRADES, GradeKey } from './grades'

const LATE_FEE_PER_MONTH = 2000
export const DEMOTION_THRESHOLD_WEEKS = 104 // ~2 ans

export function getTaxRyosByGrade(gradeKey: GradeKey | null): number {
  if (!gradeKey) return 0
  return GRADES.find(g => g.key === gradeKey)?.taxRyos ?? 0
}

export function getMonthsLate(weekStart: Date): number {
  const days = (Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(days / 30)
}

export function getLateFeeForWeek(weekStart: Date): number {
  return getMonthsLate(weekStart) * LATE_FEE_PER_MONTH
}

export function getTotalOwed(unpaidWeekStarts: Date[], gradeKey: GradeKey | null): number {
  const base = getTaxRyosByGrade(gradeKey)
  if (base === 0) return 0
  return unpaidWeekStarts.reduce((sum, ws) => sum + base + getLateFeeForWeek(ws), 0)
}
