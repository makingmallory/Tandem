// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER_ID = "61111111-1111-4111-8111-111111111111";
const MEMBER_ID = "62222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "63333333-3333-4333-8333-333333333333";

let database: PGlite;
let householdId: string;
let choreId: string;
let firstOccurrenceId: string;
let secondOccurrenceId: string;
let thirdOccurrenceId: string;
let legacyOccurrenceId: string;

async function authenticateAs(userId: string) {
  await database.exec(`
    reset role;
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `);
}

describe("Phase 4 completion, history, and RLS", () => {
  beforeAll(async () => {
    database = new PGlite();
    await database.exec(`
      create role anon noinherit;
      create role authenticated noinherit;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        email text,
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      create function auth.uid()
      returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    `);
    for (const file of [
      "20260918160000_phase1_auth_households.sql",
      "20260918190000_phase2_chore_definitions.sql",
      "20260918220000_phase3_chore_occurrences.sql",
    ]) {
      await database.exec(await readFile(path.resolve(import.meta.dirname, `../../../supabase/migrations/${file}`), "utf8"));
    }
    await database.exec(`
      insert into auth.users (id, email, raw_user_meta_data) values
        ('${OWNER_ID}', 'owner4@example.com', '{"display_name":"Mallory"}'),
        ('${MEMBER_ID}', 'member4@example.com', '{"display_name":"Nik"}'),
        ('${OUTSIDER_ID}', 'outsider4@example.com', '{"display_name":"Outsider"}');
    `);
    await authenticateAs(OWNER_ID);
    const home = await database.query<{ id: string; invite_code: string }>(
      "select * from public.create_household('Completion home')",
    );
    householdId = home.rows[0]!.id;
    await authenticateAs(MEMBER_ID);
    await database.query("select * from public.join_household($1)", [home.rows[0]!.invite_code]);
    await authenticateAs(OWNER_ID);
    const chore = await database.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Take trash out', null, 'trash', 'amber', 'weekly', 1,
        '2026-09-19', array[6]::smallint[], null,
        array['2026-09-19', '2026-09-26', '2026-10-03']::date[]
      )
    `);
    choreId = chore.rows[0]!.id;
    const occurrences = await database.query<{ id: string }>(`
      select id from public.chore_occurrences where chore_id = '${choreId}' order by scheduled_date
    `);
    [firstOccurrenceId, secondOccurrenceId, thirdOccurrenceId] = occurrences.rows.map((row) => row.id);

    const legacy = await database.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Legacy completed chore', null, 'checklist', 'teal', 'daily', 1,
        '2026-09-18', null, null, array['2026-09-18']::date[]
      )
    `);
    const legacyOccurrence = await database.query<{ id: string }>(`
      update public.chore_occurrences set status = 'completed'
      where chore_id = '${legacy.rows[0]!.id}' returning id
    `);
    legacyOccurrenceId = legacyOccurrence.rows[0]!.id;
    await database.exec("reset role");
    await database.exec(await readFile(path.resolve(
      import.meta.dirname,
      "../../../supabase/migrations/20260919010000_phase4_completion_history_realtime.sql",
    ), "utf8"));
  });

  afterAll(async () => database.close());

  it("backfills an existing completed occurrence without losing its state", async () => {
    await authenticateAs(MEMBER_ID);
    const row = await database.query<{ status: string; user_id: string }>(`
      select occurrence.status, completion.user_id
      from public.chore_occurrences occurrence
      join public.occurrence_completions completion on completion.occurrence_id = occurrence.id
      where occurrence.id = '${legacyOccurrenceId}'
    `);
    expect(row.rows[0]).toEqual({ status: "completed", user_id: OWNER_ID });
  });

  it("records the authenticated completer, exact timestamp, status, and history once", async () => {
    await authenticateAs(MEMBER_ID);
    const completion = await database.query<{ user_id: string; completed_at: string }>(`
      select user_id, completed_at::text from public.complete_occurrence('${firstOccurrenceId}', '${householdId}')
    `);
    expect(completion.rows[0]?.user_id).toBe(MEMBER_ID);
    expect(Number.isNaN(Date.parse(completion.rows[0]!.completed_at))).toBe(false);

    const occurrence = await database.query<{ status: string; scheduled_date: string; original_scheduled_date: string }>(`
      select status, scheduled_date::text, original_scheduled_date::text
      from public.chore_occurrences where id = '${firstOccurrenceId}'
    `);
    expect(occurrence.rows[0]).toEqual({
      status: "completed", scheduled_date: "2026-09-19", original_scheduled_date: "2026-09-19",
    });

    await database.query(`select * from public.complete_occurrence('${firstOccurrenceId}', '${householdId}')`);
    const counts = await database.query<{ completions: number; events: number }>(`
      select
        (select count(*)::int from public.occurrence_completions where occurrence_id = '${firstOccurrenceId}') completions,
        (select count(*)::int from public.activity_events where occurrence_id = '${firstOccurrenceId}' and event_type = 'chore_completed') events
    `);
    expect(counts.rows[0]).toEqual({ completions: 1, events: 1 });
  });

  it("undoes without deleting the occurrence and records who performed the undo", async () => {
    await authenticateAs(OWNER_ID);
    await database.query(`select * from public.undo_occurrence_completion('${firstOccurrenceId}', '${householdId}')`);
    const state = await database.query<{ status: string; completions: number; actor_user_id: string }>(`
      select occurrence.status,
        (select count(*)::int from public.occurrence_completions where occurrence_id = occurrence.id) completions,
        event.actor_user_id
      from public.chore_occurrences occurrence
      join public.activity_events event on event.occurrence_id = occurrence.id and event.event_type = 'chore_uncompleted'
      where occurrence.id = '${firstOccurrenceId}'
    `);
    expect(state.rows[0]).toEqual({ status: "scheduled", completions: 0, actor_user_id: OWNER_ID });
  });

  it("supports early completion while preserving the future scheduled date", async () => {
    await authenticateAs(MEMBER_ID);
    await database.query(`select * from public.complete_occurrence('${secondOccurrenceId}', '${householdId}')`);
    const row = await database.query<{ status: string; scheduled_date: string }>(`
      select status, scheduled_date::text from public.chore_occurrences where id = '${secondOccurrenceId}'
    `);
    expect(row.rows[0]).toEqual({ status: "completed", scheduled_date: "2026-09-26" });
  });

  it("records skip and one-off reschedule activity without shifting the series", async () => {
    await authenticateAs(OWNER_ID);
    await database.query(`select * from public.skip_occurrence('${firstOccurrenceId}', '${householdId}')`);
    await database.query(`select * from public.reschedule_occurrence('${thirdOccurrenceId}', '${householdId}', '2026-10-04')`);
    const rows = await database.query<{ event_type: string }>(`
      select event_type from public.activity_events
      where occurrence_id in ('${firstOccurrenceId}', '${thirdOccurrenceId}')
        and event_type in ('chore_skipped', 'chore_rescheduled')
      order by event_type
    `);
    expect(rows.rows.map((row) => row.event_type)).toEqual(["chore_rescheduled", "chore_skipped"]);
    const rescheduled = await database.query<{ scheduled_date: string; original_scheduled_date: string; is_rescheduled: boolean }>(`
      select scheduled_date::text, original_scheduled_date::text, is_rescheduled
      from public.chore_occurrences where id = '${thirdOccurrenceId}'
    `);
    expect(rescheduled.rows[0]).toEqual({
      scheduled_date: "2026-10-04", original_scheduled_date: "2026-10-03", is_rescheduled: true,
    });
  });

  it("moves an overdue occurrence into tomorrow's date queries without shifting its recurrence anchor", async () => {
    await authenticateAs(OWNER_ID);
    const chore = await database.query<{ id: string; anchor_date: string }>(`
      select id, anchor_date::text from public.create_chore_with_occurrences(
        '${householdId}', 'Reschedule regression', null, 'checklist', 'teal', 'weekly', 1,
        '2026-09-19', array[6]::smallint[], null, array['2026-10-01']::date[]
      )
    `);
    const occurrence = await database.query<{ id: string }>(`
      select id from public.chore_occurrences where chore_id = '${chore.rows[0]!.id}'
    `);

    await database.query(`
      select * from public.reschedule_occurrence(
        '${occurrence.rows[0]!.id}', '${householdId}', '2026-10-06'
      )
    `);

    const overdue = await database.query<{ id: string }>(`
      select id from public.chore_occurrences
      where chore_id = '${chore.rows[0]!.id}' and status = 'scheduled' and scheduled_date < '2026-10-05'
    `);
    const calendar = await database.query<{ id: string; scheduled_date: string }>(`
      select id, scheduled_date::text from public.chore_occurrences
      where chore_id = '${chore.rows[0]!.id}' and scheduled_date = '2026-10-06'
    `);
    const anchor = await database.query<{ anchor_date: string }>(`
      select anchor_date::text from public.chores where id = '${chore.rows[0]!.id}'
    `);

    expect(overdue.rows).toEqual([]);
    expect(calendar.rows).toEqual([{ id: occurrence.rows[0]!.id, scheduled_date: "2026-10-06" }]);
    expect(anchor.rows[0]).toEqual({ anchor_date: chore.rows[0]!.anchor_date });
  });

  it("prevents spoofed writes and isolates other households", async () => {
    await authenticateAs(MEMBER_ID);
    await expect(database.query(`
      insert into public.occurrence_completions (occurrence_id, household_id, user_id)
      values ('${firstOccurrenceId}', '${householdId}', '${OUTSIDER_ID}')
    `)).rejects.toThrow(/permission denied/i);

    await authenticateAs(OUTSIDER_ID);
    expect((await database.query("select id from public.occurrence_completions")).rows).toHaveLength(0);
    expect((await database.query("select id from public.activity_events")).rows).toHaveLength(0);
    await expect(database.query(
      `select * from public.complete_occurrence('${firstOccurrenceId}', '${householdId}')`,
    )).rejects.toThrow(/not authorized|permission denied/i);
  });
});
