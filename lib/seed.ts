import { db } from './db'
import bcrypt from 'bcryptjs'

let seeded = false

export async function ensureAdminExists() {
  if (seeded) return
  seeded = true
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.SITE_PASSWORD || 'changeme'
  const existing = await db.user.findUnique({ where: { username } })
  if (!existing) {
    await db.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, 10), isAdmin: true },
    })
  }
}
