# Phase 8 Rooms and Routines

The user reports that the base Rooms/Routines migration is applied remotely and
has verified Room creation, multiple Rooms, independent schedules, and Calendar
rendering. The incremental Category/checklist/Variants extension is documented in
`PHASE8_CATEGORIES_CHECKLISTS.md`; its remote migration is pending.

## Model

`rooms` and `routines` belong to a household. `routine_subtasks` contains ordered
shared instructions with stable IDs. Each room target is a separate `chores` row
with optional `room_id` and `routine_id`. Existing recurrence fields, occurrences,
completion attribution, one-off rescheduling, skips, and personal reminders stay
attached to that chore. A roomless standalone chore needs neither new reference.

`save_chore_plan` saves all room targets and subtask changes in one transaction,
using the existing occurrence RPCs when a schedule changes. Metadata-only edits
preserve occurrence IDs. Completed/skipped/rescheduled occurrences retain the
existing protections during schedule regeneration. Household membership checks,
composite foreign keys and restricted column grants protect all links. Rooms,
routines and subtasks also participate in household realtime refreshes.

## Editing and removal

The form starts with no selected rooms. Select all / Clear all are explicit.
One schedule applies to selected rooms by default. Customize schedule by room
reveals each room's schedule separately; different existing schedules are retained
when editing. Adding a room creates another schedulable chore. Removing a room
target retires that chore; re-adding it creates a new target while keeping its old
history. Removing all selected rooms creates a roomless target for the routine.
Pause/resume remains separate from retirement.

Room removal archives the room and retires its pending chore targets. Chore removal
sets `retired_at` and `is_active = false`, cancels outstanding scheduled occurrences
by marking them skipped, disables reminders and hides the chore from management.
Whole-routine removal retires every linked target. No chores, occurrences,
completions or activity events are deleted. Archived room names remain readable;
new activity records snapshot the room name and retain their existing chore-name
snapshot. Existing event records are untouched.

The current product calls a routine a Category. The incremental extension adds
persisted occurrence checklist snapshots/checkoff and target applicability, with
the parent occurrence still governing recurrence, audit and reminders. Conversion
of an existing scheduled chore into a subtask remains deferred. Suggested Chores /
Starter Categories and room filtering/grouping are planned.

## Base migration

The abandoned local Areas migration was replaced by the following migration,
which the user reports has now been applied remotely:

`supabase/migrations/20261012000000_phase8_rooms_routines.sql`

Before it is applied, a missing `rooms` table puts the new features into a pending
state. Existing standalone chore creation/editing uses the original RPCs, and
Home/Calendar/History still use the old-schema data selections. Other database
errors are surfaced rather than treated as a pending migration.

For the incremental extension, review the linked Supabase project and pending migrations, then run from
the repository root:

```powershell
npx supabase migration list
npx supabase db push
```

These remote commands have not been run by Codex for this work. The new incremental
migration preserves the existing public chore and occurrence RPC signatures.

## Manual check after applying the migration

1. In Settings, add Master Bathroom and Downstairs Bathroom.
2. Create Clean Bathroom, add a few subtasks, select both rooms, and choose weekly
   Wednesday. Confirm two chore targets appear and each has its own occurrence.
3. Edit the routine from either target; customize Downstairs Bathroom to Thursday.
   Check Master Bathroom still has its Wednesday schedule and anchor.
4. Complete Master Bathroom, then skip or reschedule Downstairs Bathroom. Check
   completion, dates, personal reminders and History independently for both rooms.
5. Add/reorder/rename/remove steps. Confirm prior completions remain in History.
6. Pause and resume one target. Remove one target and verify the other stays usable.
7. Remove a room or delete the entire routine after confirmation. Confirm pending
   work stops, management hides the retired chores, and History still has names.
8. Repeat with a roomless chore and a user in another household.

## Initial base-pass validation

- All 163 Vitest tests pass, including 16 Phase 8 in-process/PGlite database tests
  and the existing recurrence, completion, skip/reschedule and reminder suites.
- Typecheck, lint, production build and `git diff --check` pass.
- Mobile Playwright: 15 passed, 1 failed. The failure is the previously reported
  Home visual assertion in `visual-structure.spec.ts:14`, which expects no More
  actions control. The new room-selection, schedule-customization and room-rename
  layout test passes at 320, 375 and 430 pixels.
- Local `npm run db:test` cannot connect to Postgres on port 54322. Docker/Podman
  is unavailable on PATH. A pgTAP suite is provided for a local Supabase instance;
  the replacement migration itself is exercised by PGlite.

## Files changed

Paths below are relative to the repository root. The obsolete local Areas files
were removed, including their migration, manager, actions, data modules, validation
and tests. They were uncommitted and the migration was never applied remotely.

```text
PROJECT_STATUS.md
docs/PHASE8_ROOMS_ROUTINES.md
supabase/migrations/20261012000000_phase8_rooms_routines.sql
supabase/tests/phase8_rooms_routines.test.sql
src/actions/chores.ts
src/actions/rooms.ts
src/app/(app)/layout.tsx
src/app/(app)/chores/page.tsx
src/app/(app)/chores/new/page.tsx
src/app/(app)/chores/[id]/page.tsx
src/app/(app)/chores/[id]/edit/page.tsx
src/app/(app)/household/page.tsx
src/components/chore/ChoreCard.tsx
src/components/chore/ChoreCard.test.tsx
src/components/chore/ChoreForm.tsx
src/components/chore/ChoreForm.test.tsx
src/components/chore/ChoreRemoveForm.tsx
src/components/chore/ScheduleFields.tsx
src/components/layout/AppFrame.tsx
src/components/occurrence/OccurrenceCard.tsx
src/components/occurrence/OccurrenceCard.test.tsx
src/components/providers/RealtimeHouseholdProvider.tsx
src/components/providers/RealtimeHouseholdProvider.test.tsx
src/components/rooms/RoomManager.tsx
src/components/rooms/RoomManager.test.tsx
src/data/chores/queries.ts
src/data/chores/test-fixtures.ts
src/data/occurrences/queries.ts
src/data/occurrences/types.ts
src/data/rooms/copy.ts
src/data/rooms/mutations.ts
src/data/rooms/queries.ts
src/data/rooms/queries.test.ts
src/data/rooms/test-fixtures.ts
src/data/routines/mutations.ts
src/data/routines/queries.ts
src/data/supabase/types.ts
src/data/supabase/phase8-rooms-routines.integration.test.ts
src/domain/history/groupActivity.ts
src/domain/history/groupActivity.test.ts
src/lib/validation/chore-plan.ts
src/lib/validation/chore-plan.test.ts
src/styles/globals.css
tests/e2e/rooms-routines.spec.ts
```
