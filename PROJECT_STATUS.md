# Tandem Project Status

## Repository

- GitHub: <https://github.com/makingmallory/Tandem>
- Default branch: `main` (tracking `origin/main`)
- Current HEAD: `cac7bb9e55bbf2175876792c4c99bc52aa80e108` — `Complete Tandem Phase 7 visual refinement`
- Working tree: clean immediately before this file was added. `PROJECT_STATUS.md` is intentionally uncommitted for review.

## Current Development State

Tandem is a mobile-first shared-household chore PWA. The repository contains the foundations for auth and households, shared chore scheduling and completion history, realtime updates, browser push reminders, and the Phase 7 visual refinement at HEAD. Repository contents alone cannot confirm the state of deployed Supabase, cron, Vercel, or physical-device notification testing.

## Tech Stack

- Next.js 16.3.5 App Router, React 19.3.0, TypeScript 6
- Tailwind CSS 4, global CSS tokens, variable Nunito Sans, and Lucide icons
- Supabase (`@supabase/ssr` and `@supabase/supabase-js`) for auth, Postgres, RLS, Realtime, Edge Functions, and database cron integration
- TanStack Query for client data caching; Zod for validation
- PWA manifest plus a hand-authored service worker
- Vitest/JSDOM, Playwright, ESLint, and the Supabase CLI

## Implemented Functionality

- Email authentication, password changes, household creation, and joining a household with an invite flow.
- Shared chore definitions with active/paused state and recurring occurrences (daily, weekly, monthly, and interval scheduling logic).
- Household dashboard, chore list, calendar, history, settings, and household views; occurrence completion, undo, skip, and reschedule flows.
- Completion and activity records, plus Supabase Realtime invalidation for shared household data.
- Per-user, per-chore reminder preferences, browser push-subscription management, a notification test route, delivery claims, and dynamic reminder text/lead handling.
- An installable portrait PWA with a pre-cached offline page only. Authenticated pages and data are intentionally network-only when offline.
- IMPLEMENTED: Home rescheduling revalidates Home and Calendar, refreshes the initiating client, and withholds success feedback until refreshed occurrence props match the confirmed persisted date. This is not VERIFIED; production browser validation remains pending.

## Product Invariants

- Chores belong to the household, never to an assigned person; any member may complete any chore.
- A completion records who completed it, but does not create ownership or assignment.
- Reminder subscriptions are personal: each user controls reminders for each chore independently.
- Notifications are push notifications only; do not introduce email/SMS behavior without an explicit product decision.
- Preserve the zero-monthly-cost architecture and browser-installed PWA model; no native app-store dependency is assumed.

## Architecture / Data Decisions

- Next App Router pages use server actions in `src/actions`; client data modules in `src/data` separate query keys, queries, mutations, and types.
- Supabase is the persistence and authorization boundary. Household-scoped RLS and RPCs protect shared data; the browser only uses public Supabase configuration.
- Chore definitions and generated/scheduled occurrences are separate concepts. Completion/history/activity are occurrence-based.
- `RealtimeHouseholdProvider` listens for household changes to chores, occurrences, completions, and activity events, then invalidates cached shared data and refreshes server-rendered views.
- Household-local dates use `HOUSEHOLD_TIME_ZONE` (default documented as `America/Chicago`).

## Supabase / Migrations

- Ordered SQL migrations live in `supabase/migrations`, currently covering Phase 1 auth/households, Phase 2 chores, Phase 3 occurrences, Phase 4 completion history/realtime, Phase 5 push reminders, and two Phase 6 reminder refinements.
- The schema includes profiles, households/members, chores, occurrences, completion/activity records, reminders, push subscriptions, and reminder deliveries, with supporting RPCs, policies, indexes, and Realtime publication changes.
- Do not edit an already-applied migration expecting it to run again. Add a new timestamped migration for any later schema or policy change.
- `supabase/functions/send-reminders/index.ts` is the Edge Function. `supabase/cron/setup_reminder_cron.sql` provisions the five-minute reminder scan through `pg_cron`, `pg_net`, and Vault-backed values.
- Do not place secret or service-role values in browser variables or documentation.

## Push Notification / Reminder Architecture

- The browser registers a service worker (`public/sw.js`) that displays push payloads and routes notification clicks to same-origin URLs.
- Users manage subscriptions and reminder preferences through app UI/actions; subscription records are user-owned and reminders are scoped by user and chore.
- The scheduled Edge Function authenticates cron requests, claims due deliveries through database RPCs, rechecks the reminder/chore/occurrence state, sends Web Push with VAPID configuration, records results, and removes expired subscriptions after 404/410 responses.
- Shared completion matters: if any member completes an occurrence, later reminder delivery for that occurrence is suppressed.

## UI / Design State

Phase 7 is the visual baseline: a two-tier application header/brand treatment, sage progress states, compact accessible home completion circles, richer chore icons and tinted cards, and aligned Calendar, Chores, and Settings refinements. Reuse the central brand configuration, shared layout components, design tokens, and established compact/mobile-first control patterns instead of creating parallel visual systems.

## Important Files and Directories

- `src/app/` — App Router routes, root layout, manifest, and route-level UI.
- `src/actions/` — server actions for auth, chores, household, occurrences, and reminders.
- `src/components/` — shared layout, PWA, realtime, chore, occurrence, reminder, push, and UI components.
- `src/data/` — Supabase clients and feature query/mutation/cache-key layers.
- `src/domain/` — recurrence, date, and display-domain logic.
- `src/config/brand.ts` and `src/styles/globals.css` — brand constants and shared design foundation.
- `public/sw.js` and `public/icons/` — service worker, offline behavior, and install assets.
- `supabase/` — config, migrations, pgTAP tests, Edge Function, and cron setup.
- `docs/` — Supabase, push, and Vercel setup guidance.

## Testing / Validation

Use the repository scripts as written:

```text
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run db:test
npm run db:lint
```

`npm run test:e2e` runs `scripts/run-e2e.ps1`; `npm run test:e2e:run` runs Playwright directly. The Playwright configuration targets a Pixel 7 mobile Chromium project and uses a local production server on port 3100. Database commands also include `npm run db:start` and `npm run db:reset`.

## Known Limitations / Pending Production Work

- Deployment state cannot be established from this checkout. The Vercel, Supabase, Edge Function, cron, and real-device PWA/push steps in `docs/` must be checked in their respective environments.
- The tracked `supabase/cron/setup_reminder_cron.sql` has been sanitized to use placeholders. Production deployment remains pending, and rotating the previously committed cron secret is still a manual production-readiness step before setup; see `docs/PHASE5_PUSH_SETUP.md`.
- The repository documents a Supabase Free-plan inactivity caveat and recommends real-device testing for install, notifications, and realtime behavior.

## Current / Next Work

No later product feature phase is established by current repository history. The next documented focus is safe production configuration and environment validation: Supabase migration/function setup, Edge Function secrets and deployment, the five-minute cron job, Vercel environment configuration, and real-device PWA/push/realtime testing.

## Recent Meaningful Checkpoints

- `cac7bb9` — Complete Tandem Phase 7 visual refinement
- `fde68ca` — Complete Tandem Phase 6 polish and dynamic reminders
- `84a2250` — Complete Tandem Phase 5 push reminders
- `7159be2` — Complete Tandem Phase 4 collaboration
- `b25c6d1` — Complete Tandem Phase 3 scheduling
- `833c680` — Complete Tandem Phase 1 foundation

## Agent Rules

- Inspect existing code before assuming behavior.
- Preserve working functionality unless the task requires changing it.
- Do not commit or push unless explicitly asked.
- Never include secrets.
- Do not mark anything `VERIFIED`; only the user can confirm `VERIFIED`.
- Update this document after meaningful implementation work when its contents materially change.
- Keep this file concise and current.
