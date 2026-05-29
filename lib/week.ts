// Weeks run Sunday → Saturday throughout this app.

export function isoWeekToDate(isoWeek: string): Date | null {
  // ISO weeks start on Monday; we shift back 1 day to get our Sunday start.
  const match = isoWeek.trim().match(/(\d{4})-[Ss](\d+)/)
  if (!match) return null
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const weekOneStart = new Date(jan4)
  weekOneStart.setDate(jan4.getDate() - dow + 1) // Monday of ISO week 1
  const monday = new Date(weekOneStart)
  monday.setDate(weekOneStart.getDate() + (week - 1) * 7)
  monday.setDate(monday.getDate() - 1) // back to Sunday
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - day) // rewind to Sunday
  d.setHours(0, 0, 0, 0)
  d.setMinutes(0, 0, 0)
  return d
}

export function getNextWeekStart(): Date {
  const d = getWeekStart()
  d.setDate(d.getDate() + 7)
  return d
}

export function formatWeekRange(weekStart: Date | string): string {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6) // Saturday
  return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

export function isSameWeek(a: Date | string, b: Date | string): boolean {
  return getWeekStart(new Date(a)).getTime() === getWeekStart(new Date(b)).getTime()
}

export function weekLabel(weekStart: Date | string): string {
  const now = getWeekStart()
  const target = getWeekStart(new Date(weekStart))
  const diff = Math.round((target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (diff === 0) return 'Semaine actuelle'
  if (diff === 1) return 'Semaine prochaine'
  if (diff === -1) return 'Semaine dernière'
  return formatWeekRange(weekStart)
}
