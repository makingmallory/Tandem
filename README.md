# Tandem

Tandem is a private, mobile-first shared chore PWA. Phases 0–5 provide the shared application shell,
Supabase authentication and household isolation, recurring chores and occurrences, completion and
history with Realtime updates, and personal Web Push reminders. Phase 6 hardens accessibility,
responsive behavior, loading/error states, and production deployment.

[`OUR_HOME_BLUEPRINT.md`](./OUR_HOME_BLUEPRINT.md) is the product and architecture source of truth.
Visible brand copy comes from `src/config/brand.ts`; future renames should begin there.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The E2E script builds the app and manages a production server automatically. It requires Playwright
Chromium once per machine:

```bash
npx playwright install chromium
```

Production setup remains compatible with Supabase Free and Vercel Hobby. A custom domain and paid
notification provider are not required. See [`docs/VERCEL_DEPLOYMENT.md`](./docs/VERCEL_DEPLOYMENT.md)
for the exact deployment checklist and [`docs/PHASE5_PUSH_SETUP.md`](./docs/PHASE5_PUSH_SETUP.md) for
the already-established reminder backend.

## Database checks

`npm test` runs unit, component, and embedded PostgreSQL integration coverage for the migrations and
critical RLS member/outsider cases without Docker. The repository also includes Supabase-native
pgTAP coverage. With Docker running:

```bash
npm run db:start
npm run db:reset
npm run db:test
```
