# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # prisma generate + next build
npm run start        # Start production server
npm run db:push      # Apply schema changes to SQLite (no migration files)
npm run db:studio    # Open Prisma Studio
```

No test suite is configured. TypeScript is checked implicitly by the build. Playwright is installed (`npx playwright test`) but no tests have been written yet.

## Environment variables

See `.env` (copy from `.env.example`):
- `DATABASE_URL` — SQLite path, e.g. `file:./dev.db`; point to a persistent volume on Coolify
- `SESSION_SECRET` — iron-session cookie secret, min 32 chars
- `SITE_PASSWORD` — used by `lib/seed.ts` as the default admin password on first boot (`ADMIN_USERNAME` defaults to `admin`)

## Architecture

**Stack**: Next.js 16 App Router · Prisma + SQLite · iron-session · Tailwind CSS · TypeScript

### Auth flow

Every API route calls `guard()` (or `guard('admin:manage')` / `guard('gestion:manage')`) from `lib/guard.ts`. On first call it bootstraps the admin account via `ensureAdminExists()`. Sessions are encrypted cookies via iron-session (`lib/auth.ts`). Session invalidation uses `sessionVersion` on the `User` model — mismatches reject the session silently.

### Data model

```
User
  ├─ Activity[]   — guild activity submissions (status: EN_ATTENTE | VALIDEE | REFUSEE)
  ├─ Deposit[]    — resource deposit submissions (status: EN_ATTENTE | VALIDEE | REFUSEE)
  └─ Malus[]      — point penalties assigned by managers

ActivityType    — named activity templates with a point value; can be deactivated
Setting         — key/value store for app-wide config
```

### Roles & permissions (`lib/permissions.ts`)

Two roles: `MEMBRE` and `GERANT`. Permissions:
- `admin:manage` — user management, settings (GERANT only)
- `gestion:manage` — review activities, assign malus, view classement (GERANT only)

`guard(null)` — any authenticated user; `guard('gestion:manage')` — managers only.

### Weeks (`lib/week.ts`)

Weeks run **Sunday → Saturday** (UTC). `getWeekStart()` rewinds to the previous Sunday midnight UTC. `weekLabel()` formats as `YYYY-SNN`. API routes accept a `?week=` ISO date param parsed via `parseWeekParam()`.

### API surface

- `GET/POST /api/activities` — list (scoped to user, or all if manager) / submit activity
- `PATCH/DELETE /api/activities/[id]` — review (manager) or delete own pending
- `GET/POST /api/activity-types` — list active types / create (manager)
- `PATCH/DELETE /api/activity-types/[id]` — update / deactivate (manager)
- `GET/POST /api/malus` — list / assign malus (manager)
- `DELETE /api/malus/[id]` — remove malus (manager)
- `GET /api/gestion/classement` — weekly ranking by validated points
- `GET /api/me/summary` — current user's weekly stats (activities + malus)
- `GET/POST /api/admin/users` — user list / create (manager)
- `PATCH/DELETE /api/admin/users/[id]` — update role / delete (manager)

### Tailwind design tokens

Custom tokens defined in `tailwind.config.ts`:
- **Backgrounds**: `bg-bg-base` (#0A0B14) · `bg-bg-card` (#10121E) · `bg-bg-elevated` (#171929)
- **Gold accent**: `text-gold` / `bg-gold` (#F59E0B) · `gold-dark` · `gold-light` · `gold-muted`
- **Text**: `text-ink` (#E2E8F0) · `text-ink-muted` · `text-ink-faint`
- **Border**: `border-border` (#1E2140) · `border-border-subtle`
- **Shadows**: `shadow-glow` / `shadow-glow-sm` (gold glow)

Reusable component classes in `globals.css`: `.card`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input`, `.badge-paid`, `.badge-unpaid`.

### Deployment (Coolify)

`prisma/schema.prisma` declares `binaryTargets = ["native", "debian-openssl-3.0.x"]` for the Coolify Docker container. `DATABASE_URL` must point to a persistent volume, not the container filesystem.
