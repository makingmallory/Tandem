# Shared home PWA

Phase 0 establishes the reusable application shell described in
[`OUR_HOME_BLUEPRINT.md`](./OUR_HOME_BLUEPRINT.md). Product naming and visible brand copy come from
`src/config/brand.ts`; future renames should begin there.

Phase 1 adds Supabase email/password authentication, one active household per user, invite-code
joining, and database-enforced household isolation. Follow the beginner-friendly
[`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md) guide before running the authenticated app.

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

No paid service, cloud account, environment variable, or custom domain is required for Phase 0.

## Database checks

`npm test` runs the Phase 1 migration inside embedded PostgreSQL and verifies the critical RLS
member/outsider cases without Docker. The repository also includes the official Supabase pgTAP
suite at `supabase/tests/phase1_household_rls.test.sql`. With Docker running:

```bash
npm run db:start
npm run db:reset
npm run db:test
```
