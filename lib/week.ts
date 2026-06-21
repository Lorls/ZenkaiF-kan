export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() // 0=Sun
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

export function weekLabel(weekStart: Date): string {
  const jan1 = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 1))
  const dayOfYear = Math.floor((weekStart.getTime() - jan1.getTime()) / 86400000)
  const weekNum = Math.floor(dayOfYear / 7) + 1
  return `${weekStart.getUTCFullYear()}-S${String(weekNum).padStart(2, '0')}`
}

export function shiftWeek(weekStart: Date, delta: number): Date {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + delta * 7)
  return d
}

export function parseWeekParam(param?: string | null): Date {
  if (param) {
    const d = new Date(param)
    if (!isNaN(d.getTime())) return getWeekStart(d)
  }
  return getWeekStart()
}
