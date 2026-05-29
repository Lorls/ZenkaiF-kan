# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # prisma generate + next build
npm run db:push      # Apply schema changes to SQLite (no migration files)
npm run db:studio    # Open Prisma Studio
```

No test suite is configured. TypeScript is checked implicitly by the build.

## Environment variables

See `.env` (copy from `.env.example`):
- `DATABASE_URL` — SQLite path, e.g. `file:./dev.db`; point to a persistent volume on Coolify
- `SESSION_SECRET` — iron-session cookie secret, min 32 chars
- `SITE_PASSWORD` — used by `lib/seed.ts` as the default admin password on first boot (`ADMIN_USERNAME` defaults to `admin`)

## Architecture

**Stack**: Next.js App Router · Prisma + SQLite · iron-session · Tailwind CSS · TypeScript

### Auth flow

Every API route calls `guard()` (or `guard(true)` for admin-only) from `lib/guard.ts`. On the first call it runs `ensureAdminExists()` from `lib/seed.ts` to bootstrap the admin account. Sessions are encrypted cookies via iron-session (`lib/auth.ts`).

### Data model

```
User (accounts)
  └─ Log[] (author / reverter)

Ninja
  ├─ Donation[] (onDelete: Cascade)  — amount × pointsPerUnit → points added to ninja
  └─ Tax[]      (onDelete: Cascade)  — one row per (ninja, weekStart), tracks weekly tax payment

ResourceValue  — configurable points-per-unit for each resource (Settings page)
Setting        — key/value store; grade thresholds stored as "grade:GC", "grade:Chunin", etc.
```

Points on `Ninja` are **denormalised** — they are incremented/decremented at donation create/delete time and must stay in sync manually. Reverting a donation always adjusts `ninja.points`.

### Audit log + revert system (`lib/log.ts`)

Every mutating API call goes through `logAction()` which writes a `Log` row with a JSON `diff` snapshot. The `revertLog()` function reads that diff and replays the inverse operation. Key rules:
- `isCascade: true` — log was auto-reverted as a side-effect of reverting a parent (e.g. deleting a ninja cascades its donation logs); these cannot be individually reverted.
- `isOrphaned: true` — the target entity no longer exists; revert is blocked.
- Imports use a shared `sessionId`; reverting the top-level import log recursively reverts all logs in the session.

### Weeks

Weeks run **Sunday → Saturday** throughout the app (`lib/week.ts`). `getWeekStart()` rewinds to the previous (or current) Sunday at midnight. `Tax` rows are keyed on `weekStart` (the Sunday date).

### Static config

- `lib/resources.ts` — fixed list of resource names and their default point values
- `lib/grades.ts` — grade keys (`GC`, `Chunin`, `Konin`, `TKJ`) and default thresholds; live values are stored in `Setting` as `grade:<key>`

### Deployment (Coolify)

`prisma/schema.prisma` declares `binaryTargets = ["native", "debian-openssl-3.0.x"]` so the Prisma engine works in the Coolify Docker container. The `DATABASE_URL` must point to a persistent volume mount, not the container filesystem.
