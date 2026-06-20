import { GRADES, GradeKey } from './grades'

export const DEMOTION_THRESHOLD_WEEKS = 104 // ~2 ans IRL

export function getTaxRyosByGrade(gradeKey: GradeKey | null): number {
  if (!gradeKey) return 0
  return GRADES.find(g => g.key === gradeKey)?.taxRyos ?? 0
}

// 2 000 ¥ par jour IRL de retard. 7 jours de grâce : toute la semaine (dim→sam) pour payer.
export function getLateFeeForWeek(weekStart: Date): number {
  const daysLate = Math.floor((Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) - 7
  return Math.max(0, daysLate) * 2000
}

export function getTotalOwed(unpaidWeekStarts: Date[], gradeKey: GradeKey | null): number {
  const base = getTaxRyosByGrade(gradeKey)
  if (base === 0) return 0
  return unpaidWeekStarts.reduce((sum, ws) => sum + base + getLateFeeForWeek(ws), 0)
}
