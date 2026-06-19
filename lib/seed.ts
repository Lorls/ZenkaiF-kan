import { db } from './db'
import bcrypt from 'bcryptjs'

let migrated = false
let seeded = false

async function migrateRoles() {
  if (migrated) return
  migrated = true
  await db.user.updateMany({ where: { role: 'ADMIN' },  data: { role: 'GERANT' } })
  await db.user.updateMany({ where: { role: 'GÉRANT' }, data: { role: 'GERANT' } })
  await db.user.updateMany({ where: { role: 'MEMBRE' }, data: { role: 'MEMBRE_SHOMU' } })
}

export async function ensureAdminExists() {
  // Migration runs on every cold start (idempotent, cheap when already done)
  await migrateRoles()

  if (seeded) return
  seeded = true

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.SITE_PASSWORD  || 'changeme'

  // If no GERANT exists, promote the oldest account so the system stays accessible.
  const gerantCount = await db.user.count({ where: { role: 'GERANT' } })
  if (gerantCount === 0) {
    const oldest = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (oldest) {
      await db.user.update({ where: { id: oldest.id }, data: { role: 'GERANT' } })
    }
  }

  const existing = await db.user.findUnique({ where: { username } })
  if (!existing) {
    await db.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, 10), role: 'GERANT' },
    })
  } else if (existing.role !== 'GERANT') {
    await db.user.update({ where: { username }, data: { role: 'GERANT' } })
  }
}
