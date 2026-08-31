# Mess Manager

A private, mobile-first meal & expense tracker for a household/mess. Built with Next.js 14 (App Router) + TypeScript, Tailwind CSS, PostgreSQL, Prisma, and NextAuth.

> **Update:** this was originally written without a working Node.js install and so was untested. Node.js and PostgreSQL were since installed locally and the app was fully exercised end-to-end — migrations, seed, `npm run test` (10/10 passing), `npm run build` (clean TypeScript build), and manual click-through of every page as both an admin and a regular member. One real bug was found and fixed in the process: `prisma/seed.ts` created the current `Month` row directly instead of going through the app's `getOrCreateMonth()` helper, so it skipped generating the day's meal entries — today's meal toggles were empty until fixed. See `prisma/seed.ts` for the fix. Docker/Docker Compose deployment itself is still unverified (no Docker in this environment) — sanity-check `docker compose build && docker compose up -d` before relying on it in production.
>
> **Update 2:** added self-service profile management (photo, password), a stricter meal-editing window, and a neutral "not updated yet" meal state — see items 8–11 below. Also verified live: password change (wrong-password rejection + successful change + login with the new password), avatar upload/remove (via a programmatically-fed file, end to end through the real resize → server action → DB → UI-everywhere path since this sandbox has no OS file picker to click through), the 5-day edit lock (blocked for a member, bypassed for admin, guest counts unaffected), and the tri-state default on a brand-new month.
>
> **Update 3:** the "not updated" meal state is now an explicit **3-button control** (✓ / — / ✕, the middle one filled yellow) instead of an outline-only style — clicking the middle button also lets you deliberately reset a meal back to "not updated" if it was marked by mistake. Added full **export/import (backup & restore)** under Admin → Backup — see item 12 and the "Backups & moving data" section below. Verified live end-to-end: exported the real database (2 users, 3 months, 368 meal entries, 2 guest meals, 2 expenses, 36 audit entries), fed that export straight back in through Import, and confirmed every dashboard number, per-person balance, and the full audit history came back byte-identical afterward.

## Stack

- **Next.js 14** (App Router, Server Actions, Server Components) + TypeScript
- **Tailwind CSS** for a mobile-first UI (bottom nav on phones, sidebar on desktop)
- **PostgreSQL** + **Prisma** ORM
- **NextAuth (Auth.js v4)** — credentials (email/password) login, JWT sessions. No public sign-up; only an admin can create accounts.
- **Recharts** for the dashboard charts
- **Vitest** for unit tests on the financial calculation engine

## Core design decisions (things that were ambiguous in the brief)

1. **Non-meal ("other") expenses and balances** — per your instruction, non-meal expenses are split **equally across all active users** for that month and folded into each person's "cost" alongside their personal meal cost. `Balance = Paid − (Meals × MealCost) − (OtherExpenses ÷ activeUserCount)`. This guarantees balances always net to zero. See `src/lib/calculations.ts`.
2. **Default meal state** — every day, for every active user, a Lunch and Dinner row is generated in advance with `ate = null` — a neutral **"Not updated"** state. The toggle is a 3-button control (✓ green / — filled yellow / ✕ red), so the pending state is unmistakable at a glance rather than just "neither button pressed" — and clicking the middle button lets anyone deliberately reset a meal back to pending if they marked it by mistake. Nobody is assumed present or absent; a meal only counts once someone actually marks it. `null`/unset is treated as "not eaten" for cost purposes (same as `false`) until changed. (Earlier in this project the default was "Ate = true" instead — that was changed to this neutral tri-state on request. Existing rows created before that change keep whatever true/false value they already had; only new rows default to the neutral state.)
3. **Guest meals** — tracked as a single count per day/meal-slot, added to the total-meals divisor, never attributed to a specific person's balance (per your spec). One consequence, confirmed while testing: because a guest's share of the meal cost isn't billed to anyone, the two members' balances won't net to exactly zero in a month with guest meals — there's a small leftover (guest meals × meal cost) that nobody owes. The Settlement panel only ever settles the real balances between members, so this doesn't cause an incorrect payment — it just means whoever paid the underlying grocery bill ends up absorbing the guest's share. Balances still net to zero in any month with zero guest meals (verified in `tests/calculations.test.ts`).
4. **Permissions** (enforced server-side in every Server Action, not just hidden in the UI):
   - **Member (User role):** view dashboard/report/history, toggle **their own** meals, add guest-meal counts, **add** expenses.
   - **Admin:** everything above for anyone, plus **edit/delete** any expense, manage users (create/deactivate/reset password/role), open/close months, and manage categories.
   - Regular members cannot edit or delete an expense once created (even their own) — only an admin can, so there's always a second set of eyes on financial corrections. Edits still go through the audit log either way.
5. **No hard user deletion** — admins **deactivate** users instead of deleting them, so historical meals/expenses/audit entries always resolve to a real name.
6. **Closed months** — once an admin closes a month, members can no longer toggle meals or add expenses for any date in that month; admins can still edit (e.g. to fix a late-discovered mistake) and can reopen the month.
7. **Mid-month deactivation** — deactivating a user stops them from being included in *future* months, and a newly-added user is only backfilled with meal rows from today onward (not retroactively). Deactivation doesn't auto-clear a user's remaining meal rows for the rest of an already-generated month — for a mid-month departure, have an admin also toggle their remaining Lunch/Dinner rows off (or just leave the neutral "Not updated" state, which already doesn't count toward cost).
8. **Meal edit window** — a regular member can only toggle a meal (Ate/Did not eat) for today or the last 5 days; older entries are locked (a banner explains why) so history doesn't get quietly rewritten weeks later. Admins bypass this entirely and can always correct any date. The guest-meal counter is **not** covered by this window — it can be edited any time the month is open, since a guest count is more of a running tally than a personal record. The window length lives as `MEAL_EDIT_WINDOW_DAYS` in `src/lib/utils.ts`.
9. **Profile self-service** — every user gets a `/profile` page (reachable from the avatar menu) to change their own password (requires entering the current one) and upload/remove a profile picture, plus a read-only view of their own current-month stats (with a month switcher to look back). Name, email, and role are still admin-only edits from Admin → Users — a member can't quietly rename or promote themselves.
10. **Profile pictures stored as data URIs, not files** — uploads are resized client-side (canvas, capped at 256×256, JPEG ~85% quality — typically 10–40KB) and stored directly in the `User.avatarDataUrl` Postgres column as a `data:image/jpeg;base64,...` string, rather than as files on disk. This means avatars survive container rebuilts/redeploys automatically with zero extra Docker volume or file-storage setup, and get backed up for free alongside the rest of the database. The tradeoff is it's not suited to large/many images — fine for a couple of household member photos, not a general file-upload feature. Avatars are deliberately kept out of the auth JWT/session cookie (fetched fresh from the DB where displayed) so they don't bloat every request's cookie.
11. **"Forgot password" on login** — per your choice, this doesn't send an email (no SMTP/Resend/SendGrid credentials were available to configure one). It's a small expandable note on the login page pointing the person to ask an admin, who can reset anyone's password from Admin → Users. If you later want a real emailed reset link, that's a bigger addition — give me email-provider credentials and I can wire it up.
12. **Export/Import (Admin → Backup)** — full database export to one JSON file, and import that replaces everything currently in the database with the contents of a file. A few deliberate choices worth knowing:
    - **Import is a full wipe-and-replace, not a merge.** It's meant for disaster recovery or moving to a fresh install, not routine two-way syncing between environments — merging would mean resolving ID collisions and conflicting audit trails, which is a much harder (and riskier) problem than this needed to solve.
    - The export **includes password hashes** (bcrypt, not plaintext) so a restore doesn't lock everyone out — treat exported files as sensitive, same as database access.
    - Import requires typing `REPLACE ALL DATA` exactly, on top of being admin-only, since there's no undo.
    - Runs inside a single database transaction, so a failure partway through rolls back instead of leaving a half-restored database.
    - **This is a safety net, not your primary defense against data loss** — see "Backups & moving data" below for why a normal `git pull` + rebuild deploy doesn't actually threaten your data in the first place.

## Getting started (local development)

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL, NEXTAUTH_SECRET, SEED_* values
npm run db:migrate     # creates the Postgres schema (needs a running Postgres — see below)
npm run db:seed        # creates the two starting users + default categories + current month
npm run dev
```

You need a Postgres instance for local dev. Quickest option if you have Docker:

```bash
docker run --name mess-postgres -e POSTGRES_USER=mess_user -e POSTGRES_PASSWORD=change_me -e POSTGRES_DB=mess_manager -p 5432:5432 -d postgres:16-alpine
```

Then visit `http://localhost:3000`, sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`, and change the password from Admin → Users immediately.

### First run checklist

Because this was authored without a Node/Docker environment to verify it, before you trust it in production:

1. `npm install` — confirm it resolves cleanly.
2. `npm run test` — runs `tests/calculations.test.ts` (the financial engine). These are the tests that matter most; they encode the worked example from your spec (92/88 meals, ৳7,500/৳7,200 cost, ৳2,500 settlement) plus guest-meal, other-expense-split, and divide-by-zero edge cases.
3. `npm run build` — a full TypeScript + Next.js production build will surface any typos or type mismatches.
4. `npm run db:migrate` against a real Postgres, then `npm run db:seed`, then click through Dashboard → Meals → Expenses → Report → History → Admin once as both roles.

## Adding more users later

Sign in as an admin → **Admin → Users → Add User**. The new member automatically gets meal rows backfilled for the rest of the current open month so they show up in totals immediately.

## Backups & moving data

**First, the important part: a normal update does not touch your data.** `docker-compose.yml` gives Postgres its own named volume (`pgdata`), separate from the app container. When you `git pull`, then `docker compose build && docker compose up -d`, only the `app` container gets rebuilt and replaced — the `db` container keeps running (or restarts) with the exact same `pgdata` volume attached. Nothing in that flow deletes data. **The only things that would wipe it** are `docker compose down -v` (the `-v` removes volumes — never run this on the live VPS), manually deleting the volume, or a migration that's explicitly destructive (none of the ones in this repo are).

So for routine `git push` → VPS `git pull` → rebuild updates, you don't need to do anything special — just don't add `-v` to a `down`, and don't delete the volume.

For genuine peace of mind (or moving to a new VPS, or before trying something risky), use **Admin → Backup**:

- **Export All Data** downloads one JSON file with every user, month, meal, guest meal, expense, category, and audit entry. Do this before any risky change (a schema migration you're unsure about, a VPS migration, etc.), and consider a weekly cron job hitting the export endpoint from an authenticated session if you want it automated.
- **Import** restores from that file — but it **replaces everything currently in the database**, so only use it to recover onto an empty/broken database or to seed a fresh environment with real data, not as a two-way sync.

This is in addition to, not instead of, a real Postgres dump for disaster recovery:
```bash
docker compose exec db pg_dump -U mess_user mess_manager > backup-$(date +%F).sql
```

## Production deployment (single VPS, Docker Compose + Nginx)

1. Copy `.env.example` to `.env` on the VPS and fill in real secrets (`openssl rand -base64 32` for `NEXTAUTH_SECRET`), plus `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` and the `SEED_*` values for the first two accounts. Set `NEXTAUTH_URL` to `https://mess.yourdomain.com`.
2. Build and start:
   ```bash
   docker compose build
   docker compose up -d
   ```
   The `app` container runs `prisma migrate deploy` automatically on every start (see `docker-entrypoint.sh`). It does **not** auto-seed by default — run the seed once by hand:
   ```bash
   docker compose exec app node_modules/.bin/tsx prisma/seed.ts
   ```
   (or set `RUN_SEED_ON_START=true` in `.env` before the first `up`, then set it back to `false`).
3. The app container publishes on `127.0.0.1:3000` only — it's not exposed to the internet directly. Install the sample Nginx site config at [`nginx/mess-manager.conf`](nginx/mess-manager.conf) on the host and point it at your subdomain, then get TLS with Certbot:
   ```bash
   sudo cp nginx/mess-manager.conf /etc/nginx/sites-available/mess-manager.conf
   sudo ln -s /etc/nginx/sites-available/mess-manager.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d mess.yourdomain.com
   ```
4. Back up the `pgdata` Docker volume regularly (`docker compose exec db pg_dump -U <user> <db> > backup.sql`) — this is your only copy of the financial history.

## Project structure

```
prisma/schema.prisma      Database schema (Users, Months, MealEntry, GuestMeal, Expense, Category, AuditLog)
prisma/seed.ts             Seeds default categories, the two starting accounts, and the current month
src/lib/calculations.ts    Pure, unit-tested financial engine (meal cost, balances, settlement)
src/lib/reports.ts         Aggregates Prisma data into the shapes the calculations engine expects
src/lib/audit.ts           Audit log helpers used by every mutation
src/lib/session.ts         requireUser() / requireAdmin() — the actual permission enforcement
src/lib/utils.ts           Date helpers incl. isWithinMealEditWindow() (the 5-day lock)
src/app/actions/*.ts       Server Actions (all mutations go through here, always permission + validation checked)
src/app/actions/profile.ts Self-service password change + avatar upload/remove
src/app/actions/backup.ts  Import (replace-all-data restore) — export lives in the API route below
src/app/api/admin/backup/export/route.ts  Export All Data download (admin-only, plain Route Handler)
src/lib/backup.ts          Backup JSON shape (zod) + buildBackup()/restoreBackup() — the actual export/import logic
src/app/(app)/*            Authenticated pages: dashboard, meals, expenses, report, history, admin, profile
src/components/Avatar.tsx  Shared avatar (picture, falling back to name initials)
tests/calculations.test.ts Unit tests for the financial engine
```

## Running tests

```bash
npm run test
```

## Future: multi-mess / Android app

Noted for later — the plan to eventually ship this as an Android (Play Store) app where each household signs up and gets its own mess/admin/members is a much bigger change than anything here: today the whole app is single-tenant (one household, hardcoded to this one database). Nothing built so far blocks that direction — the export/import format, the audit log, and the permission model would all carry over conceptually — but getting there means adding a `Mess`/tenant model that every table scopes to, a real sign-up flow, and (for an actual Android app) either a mobile client hitting this backend as an API or a from-scratch native/React Native app. Worth planning as its own project when you're ready, rather than something to bolt on incrementally.
