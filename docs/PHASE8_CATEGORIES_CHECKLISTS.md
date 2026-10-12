# Phase 8 Category checklists and Variants

The base Rooms migration is applied remotely according to the user. Its file is
unchanged. The incremental migration is pending:
`20261012120000_phase8_categories_checklists_variants.sql`.

## Product and data model

Add first asks Chore or Category. A Chore is a standalone schedulable task; a
Category is a schedulable group with zero or more Subtasks. Both may use optional
Rooms or local Variants. Rooms are household locations; Variants belong to one
definition only. Backend `routines` / `routine_subtasks` names remain. `routines.kind`
distinguishes the product type, and each target remains an ordinary `chores` row
with independent recurrence, occurrences and personal reminders.

`routine_variants` adds local names; `chores.variant_id` links the target to a
variant in the same routine and household. Room + Variant combinations must be
selected explicitly. With only Rooms or only Variants, one shared schedule is the
default and per-target schedules can be customized. The collapsed Rooms summary
retains selection while editing.

`subtask_target_exclusions` stores only exclusions, keyed by the actual target
chore. Composite keys require both the definition step and target to belong to
the same routine and household. New targets receive all steps by default.

## Checklist and completion

`occurrence_subtasks` materializes applicable step titles, order and completion
actor/time for each occurrence. Occurrences also snapshot their title, Room and
Variant labels. Materialization of existing occurrences uses the definitions
available at migration time; earlier unrecorded step labels cannot be recovered.
Existing event-time title/Room labels are used when available for the backfill.
Existing completed occurrences inherit their recorded completion actor/time.

Future untouched scheduled occurrences adopt definition/applicability changes.
Past, completed, skipped, rescheduled, partially worked, and previously audited snapshots remain
unchanged. Schedule regeneration and pause preserve checklist progress. Removing
a definition step nulls its source reference while retaining its occurrence
snapshot. Retirement preserves checklists/completions, cancels pending work and
disables reminders. History links to the saved occurrence, including retired work.

The existing parent status enum remains unchanged. Some checked steps derive
In Progress while the parent stays scheduled. The final checked step completes
the parent with the acting user's existing completion/audit behavior. Complete all
checks every applicable step transactionally. Individual uncheck reopens the
parent while retaining other checked steps; parent Undo clears every checked step.
Mutation RPCs serialize checklist/definition/retirement writes before row locks.
Skipped/retired checklists are read only. Direct client writes and calls to the
internal original completion helpers are denied.

Calendar, Home and current/previous occurrence Details share one checklist
component and authoritative server actions. Calendar shows a strong title,
secondary Room/Variant context, visible applicable steps and Complete all.
Standalone roomless Chore cards have no empty checklist UI. Partial progress does
not suppress reminders; final parent completion uses the existing suppression path.

## Applying later

From the repository root, after reviewing the linked project and pending list:

```powershell
npx supabase migration list
npx supabase db push
```

Codex has not run these remote commands. Capability checks keep the applied base
schema usable until the extension is applied and prevent silently saving unsupported
new model options. No dependency, commit, push or deployment is part of this task.

## Manual verification after migration

1. Add → Chore: create a roomless recurring task and confirm its existing behavior.
2. Add → Category: create Clean Bathroom, two Rooms and toilet/mirror/shower steps.
   Collapse Rooms and save; both selections should remain.
3. Customize Shower applicability to Upstairs only. Confirm Calendar checklists
   differ while room schedules remain independent.
4. Check a step: see In Progress. Check the last step: see Complete with correct
   attribution. Uncheck a step and then exercise parent Complete all and Undo.
5. Verify another Room/date is unchanged. Skip/reschedule one target, then open
   its occurrence from History.
6. Rename/remove/reorder steps and confirm past/completed/partially worked checklists
   retain their labels and state.
7. Create Laundry with Darks/Whites/Towels and customize one schedule. Complete
   one variant and confirm the others stay incomplete.
8. Select both Rooms and Variants: choose only the intended combinations, verify
   no implicit product, and remove a target/category while retaining History.

Suggested Chores / Starter Categories is next. No new behavior is marked VERIFIED.

## Validation results

- Full Vitest: 194 tests in 45 files pass. This includes 16 incremental migration,
  checklist, applicability, variant, RLS, audit/retirement and reminder tests in
  PGlite, plus the existing recurrence/completion/undo/skip/reschedule regressions.
- Typecheck, lint, build and `git diff --check` pass.
- Playwright: 17 pass, including new Category/Calendar phone-width tests. The one
  failure is the previously reported Home assertion at `visual-structure.spec.ts:14`
  expecting no More actions control. Browser tests use the local fixture shell;
  new remote behavior remains pending the migration and manual verification.
- `npm run db:test` cannot connect to the local Postgres port 54322; Docker/Podman
  is unavailable. A pgTAP suite is provided for a future local Supabase run.
- Applied base migration checksum remains
  `A9A251413D655853A20EAF7D4B14F95D18F9B7EEAA525F74B56202394698F646`.

## Files touched by this extension

The pre-existing Phase 8 work remains uncommitted. The applied base migration is
unchanged (its SHA-256 matches the value read at the start of this task).

```text
PROJECT_STATUS.md
docs/PHASE8_ROOMS_ROUTINES.md
docs/PHASE8_CATEGORIES_CHECKLISTS.md
supabase/migrations/20261012120000_phase8_categories_checklists_variants.sql
supabase/tests/phase8_category_checklists.test.sql
src/actions/chores.ts
src/actions/occurrences.ts
src/actions/checklists.test.ts
src/app/(app)/layout.tsx
src/app/(app)/calendar/page.tsx
src/app/(app)/chores/page.tsx
src/app/(app)/chores/new/page.tsx
src/app/(app)/chores/[id]/page.tsx
src/app/(app)/chores/[id]/edit/page.tsx
src/app/(app)/chores/[id]/occurrences/[occurrenceId]/page.tsx
src/app/(app)/history/page.tsx
src/components/chore/ChoreCard.tsx
src/components/chore/ChoreCard.test.tsx
src/components/chore/ChoreForm.tsx
src/components/chore/ChoreForm.test.tsx
src/components/chore/ChoreRemoveForm.tsx
src/components/chore/ChoreStatusForm.tsx
src/components/chore/NewChoreFlow.tsx
src/components/chore/NewChoreFlow.test.tsx
src/components/layout/AppFrame.tsx
src/components/occurrence/OccurrenceActions.tsx
src/components/occurrence/OccurrenceCard.tsx
src/components/occurrence/OccurrenceCard.test.tsx
src/components/occurrence/OccurrenceChecklist.tsx
src/components/occurrence/OccurrenceChecklist.test.tsx
src/components/providers/RealtimeHouseholdProvider.tsx
src/components/providers/RealtimeHouseholdProvider.test.tsx
src/data/checklists/mutations.ts
src/data/chores/test-fixtures.ts
src/data/occurrences/normalize.ts
src/data/occurrences/queries.ts
src/data/occurrences/test-fixtures.ts
src/data/occurrences/types.ts
src/data/routines/capabilities.ts
src/data/routines/capabilities.test.ts
src/data/routines/queries.ts
src/data/supabase/types.ts
src/data/supabase/phase8-category-checklists.integration.test.ts
src/domain/history/groupActivity.ts
src/lib/validation/chore-plan.ts
src/lib/validation/chore-plan.test.ts
src/styles/globals.css
tests/e2e/category-checklists.spec.ts
tests/e2e/chore-form.spec.ts
tests/e2e/responsive-accessibility.spec.ts
tests/e2e/rooms-routines.spec.ts
```
