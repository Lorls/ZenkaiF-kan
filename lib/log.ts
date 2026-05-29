import { db } from './db'
import { AuthUser } from './guard'

// ── Types ────────────────────────────────────────────────────

type Action = 'create' | 'update' | 'delete' | 'import' | 'revert'
type Entity = 'ninja' | 'donation' | 'tax' | 'settings' | 'grades' | 'import'

interface LogParams {
  user: AuthUser | null
  action: Action
  entity: Entity
  entityId?: number
  entityName?: string
  diff?: Record<string, unknown>
  sessionId?: string
}

// ── Description generator ────────────────────────────────────

export function makeDescription(
  action: Action,
  entity: Entity,
  entityName: string | undefined,
  diff: Record<string, unknown> = {}
): string {
  const n = entityName ?? '?'
  switch (`${action}:${entity}`) {
    case 'create:ninja':   return `A inscrit le ninja ${n}`
    case 'delete:ninja': {
      const pts = (diff.before as Record<string, number> | undefined)?.points ?? 0
      return `A supprimé ${n} (était à ${Math.round(pts)} pts)`
    }
    case 'update:ninja': {
      const parts: string[] = []
      const d = diff as Record<string, { from: unknown; to: unknown }>
      if (d.name)   parts.push(`A renommé ${d.name.from} → ${d.name.to}`)
      if (d.points) parts.push(`A modifié les points de ${n} : ${d.points.from} → ${d.points.to} (${Number(d.points.to) >= Number(d.points.from) ? '+' : ''}${Math.round(Number(d.points.to) - Number(d.points.from))})`)
      return parts.join(' · ') || `A modifié ${n}`
    }
    case 'create:donation': {
      const d = diff.after as Record<string, unknown> | undefined
      return `A enregistré ${d?.amount ?? '?'} ${d?.resource ?? '?'} pour ${n} (+${Math.round(Number(d?.pointsEarned ?? 0))} pts)`
    }
    case 'delete:donation': {
      const d = diff.before as Record<string, unknown> | undefined
      return `A supprimé un don de ${d?.amount ?? '?'} ${d?.resource ?? '?'} de ${n} (-${Math.round(Number(d?.pointsEarned ?? 0))} pts)`
    }
    case 'update:tax': {
      const d = diff as { paid: { from: boolean; to: boolean }; week?: string }
      const state = d.paid.to ? 'payée' : 'impayée'
      return `A marqué la taxe de ${n} ${state}${d.week ? ` (sem. ${d.week})` : ''}`
    }
    case 'update:settings': {
      const parts = Object.entries(diff)
        .filter(([, v]) => (v as { from: unknown; to: unknown }).from !== (v as { from: unknown; to: unknown }).to)
        .map(([k, v]) => `${k} : ${(v as { from: unknown }).from} → ${(v as { to: unknown }).to} pts/u`)
      return parts.length ? `A modifié les ressources — ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? ` +${parts.length - 3}` : ''}` : 'A modifié les paramètres'
    }
    case 'update:grades': {
      const parts = Object.entries(diff)
        .filter(([, v]) => (v as { from: unknown; to: unknown }).from !== (v as { from: unknown; to: unknown }).to)
        .map(([k, v]) => `${k} : ${(v as { from: unknown }).from} → ${(v as { to: unknown }).to} pts`)
      return parts.length ? `A modifié les seuils — ${parts.join(', ')}` : 'A modifié les seuils de grade'
    }
    case 'create:import': {
      const d = diff as { ninjas?: number; donations?: number; taxes?: number; rows?: number }
      return `A importé ${d.rows ?? '?'} lignes — ${d.ninjas ?? 0} ninjas, ${d.donations ?? 0} dons, ${d.taxes ?? 0} taxes`
    }
    case 'revert:revert':  return `A annulé une action de ${n}`
    default:               return `${action} · ${entity} · ${n}`
  }
}

// ── Log creation ─────────────────────────────────────────────

export async function logAction(params: LogParams) {
  const { user, action, entity, entityId, entityName, diff = {}, sessionId } = params
  const description = makeDescription(action, entity, entityName, diff)
  return db.log.create({
    data: {
      userId:      user?.userId ?? null,
      username:    user?.username ?? 'Système',
      action,
      entity,
      entityId:    entityId ?? null,
      entityName:  entityName ?? null,
      description,
      diff:        Object.keys(diff).length ? JSON.stringify(diff) : null,
      sessionId:   sessionId ?? null,
    },
  })
}

// ── Revert ───────────────────────────────────────────────────

export async function revertLog(
  logId: number,
  by: AuthUser,
  reason?: string
): Promise<{ ok: boolean; message: string }> {
  const log = await db.log.findUnique({ where: { id: logId } })
  if (!log) return { ok: false, message: 'Log introuvable' }
  if (log.reverted)  return { ok: false, message: 'Déjà annulé' }
  if (log.isCascade) return { ok: false, message: 'Annulation en cascade, non annulable' }
  if (log.isOrphaned) return { ok: false, message: 'Entité introuvable, impossible d\'annuler' }
  if (log.action === 'revert') return { ok: false, message: 'Impossible d\'annuler un revert' }

  const diff = log.diff ? JSON.parse(log.diff) : {}

  try {
    if (log.action === 'create' && log.entity === 'ninja' && log.entityId) {
      const ninja = await db.ninja.findUnique({ where: { id: log.entityId } })
      if (!ninja) {
        await db.log.update({ where: { id: logId }, data: { isOrphaned: true } })
        return { ok: false, message: 'Ninja introuvable' }
      }
      await db.ninja.delete({ where: { id: log.entityId } })
      // Cascade-mark related logs
      await db.log.updateMany({
        where: { entityId: log.entityId, entity: { in: ['ninja', 'donation', 'tax'] }, reverted: false, id: { not: logId } },
        data: { isCascade: true, revertedAt: new Date(), revertedByName: by.username, revertedById: by.userId },
      })
    }

    else if (log.action === 'update' && log.entity === 'ninja' && log.entityId) {
      const ninja = await db.ninja.findUnique({ where: { id: log.entityId } })
      if (!ninja) {
        await db.log.update({ where: { id: logId }, data: { isOrphaned: true } })
        return { ok: false, message: 'Ninja introuvable' }
      }
      const restore: Record<string, unknown> = {}
      if (diff.name)   restore.name   = diff.name.from
      if (diff.points) restore.points = diff.points.from
      await db.ninja.update({ where: { id: log.entityId }, data: restore })
    }

    else if (log.action === 'delete' && log.entity === 'ninja') {
      const before = diff.before as Record<string, unknown> | undefined
      if (!before) return { ok: false, message: 'Snapshot manquant' }
      const created = await db.ninja.create({ data: { name: before.name as string, points: Number(before.points ?? 0) } })
      // Restore donations
      const donations = (before.donations as Record<string, unknown>[] | undefined) ?? []
      for (const d of donations) {
        await db.donation.create({ data: { ninjaId: created.id, resource: d.resource as string, amount: Number(d.amount), pointsEarned: Number(d.pointsEarned) } })
      }
      // Restore taxes
      const taxes = (before.taxes as Record<string, unknown>[] | undefined) ?? []
      for (const t of taxes) {
        await db.tax.create({ data: { ninjaId: created.id, weekStart: new Date(t.weekStart as string), paid: Boolean(t.paid) } })
      }
    }

    else if (log.action === 'create' && log.entity === 'donation' && log.entityId) {
      const donation = await db.donation.findUnique({ where: { id: log.entityId } })
      if (!donation) {
        await db.log.update({ where: { id: logId }, data: { isOrphaned: true } })
        return { ok: false, message: 'Don introuvable' }
      }
      await db.$transaction([
        db.donation.delete({ where: { id: log.entityId } }),
        db.ninja.update({ where: { id: donation.ninjaId }, data: { points: { decrement: donation.pointsEarned } } }),
      ])
    }

    else if (log.action === 'delete' && log.entity === 'donation') {
      const before = diff.before as Record<string, unknown> | undefined
      if (!before) return { ok: false, message: 'Snapshot manquant' }
      const ninja = await db.ninja.findUnique({ where: { id: Number(before.ninjaId) } })
      if (!ninja) return { ok: false, message: 'Ninja parent introuvable' }
      await db.$transaction([
        db.donation.create({ data: { ninjaId: Number(before.ninjaId), resource: before.resource as string, amount: Number(before.amount), pointsEarned: Number(before.pointsEarned) } }),
        db.ninja.update({ where: { id: Number(before.ninjaId) }, data: { points: { increment: Number(before.pointsEarned) } } }),
      ])
    }

    else if (log.action === 'update' && log.entity === 'tax') {
      const d = diff as { paid: { from: boolean; to: boolean }; ninjaId: number; weekStart: string }
      await db.tax.upsert({
        where: { ninjaId_weekStart: { ninjaId: d.ninjaId, weekStart: new Date(d.weekStart) } },
        update: { paid: d.paid.from },
        create: { ninjaId: d.ninjaId, weekStart: new Date(d.weekStart), paid: d.paid.from },
      })
    }

    else if (log.action === 'update' && log.entity === 'settings') {
      const ops = Object.entries(diff).map(([resource, v]) =>
        db.resourceValue.upsert({
          where: { resource },
          update: { pointsPerUnit: Number((v as { from: number }).from) },
          create: { resource, pointsPerUnit: Number((v as { from: number }).from) },
        })
      )
      await db.$transaction(ops)
    }

    else if (log.action === 'update' && log.entity === 'grades') {
      const ops = Object.entries(diff).map(([k, v]) =>
        db.setting.upsert({
          where: { key: `grade:${k}` },
          update: { value: String((v as { from: number }).from) },
          create: { key: `grade:${k}`, value: String((v as { from: number }).from) },
        })
      )
      await db.$transaction(ops)
    }

    else if (log.action === 'create' && log.entity === 'import' && log.sessionId) {
      // Revert all logs in this session
      const sessionLogs = await db.log.findMany({
        where: { sessionId: log.sessionId, reverted: false, isCascade: false, action: { not: 'revert' } },
        orderBy: { id: 'desc' },
      })
      for (const sl of sessionLogs) {
        if (sl.id !== logId) {
          await revertLog(sl.id, by, 'Revert d\'import groupé')
        }
      }
    }

    else {
      return { ok: false, message: `Revert non supporté pour ${log.action}:${log.entity}` }
    }

    // Mark log as reverted
    await db.log.update({
      where: { id: logId },
      data: { reverted: true, revertedAt: new Date(), revertedById: by.userId, revertedByName: by.username, revertReason: reason ?? null },
    })

    // Create revert log
    await db.log.create({
      data: {
        userId: by.userId, username: by.username,
        action: 'revert', entity: log.entity as Entity,
        entityId: log.entityId ?? null, entityName: log.entityName ?? null,
        description: `A annulé : "${log.description}" (par ${log.username})`,
        diff: JSON.stringify({ revertedLogId: logId }),
        parentLogId: logId,
      },
    })

    return { ok: true, message: 'Action annulée avec succès' }
  } catch (e) {
    console.error('Revert error:', e)
    return { ok: false, message: 'Erreur lors de l\'annulation' }
  }
}
