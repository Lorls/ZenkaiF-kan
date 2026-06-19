import { db } from './db'
import bcrypt from 'bcryptjs'

let seeded = false

export async function ensureAdminExists() {
  if (seeded) return
  seeded = true
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.SITE_PASSWORD || 'changeme'

  // If no ADMIN exists at all (e.g. after a migration that dropped isAdmin),
  // promote the oldest account so the system stays accessible.
  const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
  if (adminCount === 0) {
    const oldest = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (oldest) {
      await db.user.update({ where: { id: oldest.id }, data: { role: 'ADMIN' } })
    }
  }

  // Ensure the seed admin account exists with ADMIN role.
  const existing = await db.user.findUnique({ where: { username } })
  if (!existing) {
    await db.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, 10), role: 'ADMIN' },
    })
  } else if (existing.role !== 'ADMIN') {
    await db.user.update({ where: { username }, data: { role: 'ADMIN' } })
  }
}
