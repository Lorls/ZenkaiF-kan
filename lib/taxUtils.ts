import { GRADES, GradeKey } from './grades'

export const DEMOTION_THRESHOLD_WEEKS = 104 // ~2 ans IRL

export function getTaxRyosByGrade(gradeKey: GradeKey | null): number {
  if (!gradeKey) return 0
  return GRADES.find(g => g.key === gradeKey)?.taxRyos ?? 0
}

// 1 jour IRL = 1 an HRP → 2 000 ¥ de pénalité par jour IRL de retard
export function getLateFeeForWeek(weekStart: Date): number {
  const days = Math.floor((Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, days) * 2000
}

export function getTotalOwed(unpaidWeekStarts: Date[], gradeKey: GradeKey | null): number {
  const base = getTaxRyosByGrade(gradeKey)
  if (base === 0) return 0
  return unpaidWeekStarts.reduce((sum, ws) => sum + base + getLateFeeForWeek(ws), 0)
}
