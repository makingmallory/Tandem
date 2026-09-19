// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER_ID = "51111111-1111-4111-8111-111111111111";
const MEMBER_ID = "52222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "53333333-3333-4333-8333-333333333333";

let database: PGlite;
let householdId: string;
let choreId: string;

async function authenticateAs(userId: string) {
  await database.exec(`
    reset role;
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `);
}

describe("Phase 3 occurrence migration and RLS", () => {
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
      returns uuid
      language sql
      stable
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
        ('${OWNER_ID}', 'owner3@example.com', '{"display_name":"Owner"}'),
        ('${MEMBER_ID}', 'member3@example.com', '{"display_name":"Member"}'),
        ('${OUTSIDER_ID}', 'outsider3@example.com', '{"display_name":"Outsider"}');
    `);
    await authenticateAs(OWNER_ID);
    const home = await database.query<{ id: string; invite_code: string }>(
      "select * from public.create_household('Occurrence home')",
    );
    householdId = home.rows[0]!.id;
    await authenticateAs(MEMBER_ID);
    await database.query("select * from public.join_household($1)", [home.rows[0]!.invite_code]);
  });

  afterAll(async () => database.close());

  it("creates a definition and its future occurrences together", async () => {
    await authenticateAs(OWNER_ID);
    const created = await database.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Counters', null, 'sparkle', 'rose', 'daily', 1,
        '2026-09-18', null, null,
        array['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21']::date[]
      )
    `);
    choreId = created.rows[0]!.id;
    const dates = await database.query<{ scheduled_date: string }>(
      `select scheduled_date::text from public.chore_occurrences where chore_id = '${choreId}' order by scheduled_date`,
    );
    expect(dates.rows.map((row) => row.scheduled_date)).toEqual([
      "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21",
    ]);
  });

  it("keeps existing Phase 2 chore definitions compatible with a non-null anchor", async () => {
    await authenticateAs(OWNER_ID);
    const legacy = await database.query<{ anchor_matches_created_date: boolean }>(`
      insert into public.chores (
        household_id, name, icon_key, accent_key, recurrence_type,
        interval_count, weekdays, created_by
      ) values (
        '${householdId}', 'Legacy routine', 'home', 'teal', 'weekly',
        1, array[1]::smallint[], '${OWNER_ID}'
      )
      returning anchor_date = created_at::date as anchor_matches_created_date
    `);
    expect(legacy.rows[0]?.anchor_matches_created_date).toBe(true);
  });

  it("lets another household member see the same occurrences", async () => {
    await authenticateAs(MEMBER_ID);
    const rows = await database.query<{ chore_id: string }>("select chore_id from public.chore_occurrences");
    expect(rows.rows).toHaveLength(4);
    expect(rows.rows.every((row) => row.chore_id === choreId)).toBe(true);
  });

  it("regenerates only future untouched scheduled occurrences", async () => {
    await authenticateAs(OWNER_ID);
    await database.exec(`
      update public.chore_occurrences set status = 'skipped'
      where chore_id = '${choreId}' and scheduled_date = '2026-09-20';
      update public.chore_occurrences set status = 'completed'
      where chore_id = '${choreId}' and scheduled_date = '2026-09-18';
      update public.chore_occurrences
      set scheduled_date = '2026-09-22', is_rescheduled = true
      where chore_id = '${choreId}' and scheduled_date = '2026-09-21';
    `);
    await database.query(`
      select id from public.update_chore_with_occurrences(
        '${choreId}', '${householdId}', 'Counters', null, 'sparkle', 'rose',
        'weekly', 1, '2026-09-19', array[3]::smallint[], null,
        '2026-09-19', array['2026-09-23']::date[]
      )
    `);
    const rows = await database.query<{
      scheduled_date: string;
      status: string;
      is_rescheduled: boolean;
      anchor_date: string;
    }>(`
      select occurrence.scheduled_date::text, occurrence.status, occurrence.is_rescheduled, chore.anchor_date::text
      from public.chore_occurrences occurrence
      join public.chores chore on chore.id = occurrence.chore_id
      where occurrence.chore_id = '${choreId}' order by occurrence.scheduled_date
    `);
    expect(rows.rows).toEqual([
      { scheduled_date: "2026-09-18", status: "completed", is_rescheduled: false, anchor_date: "2026-09-19" },
      { scheduled_date: "2026-09-20", status: "skipped", is_rescheduled: false, anchor_date: "2026-09-19" },
      { scheduled_date: "2026-09-22", status: "scheduled", is_rescheduled: true, anchor_date: "2026-09-19" },
      { scheduled_date: "2026-09-23", status: "scheduled", is_rescheduled: false, anchor_date: "2026-09-19" },
    ]);
  });

  it("keeps skipped items out of the active overdue query", async () => {
    await authenticateAs(MEMBER_ID);
    const overdue = await database.query<{ scheduled_date: string }>(`
      select scheduled_date::text from public.chore_occurrences
      where household_id = '${householdId}' and status = 'scheduled' and scheduled_date < '2026-09-21'
    `);
    expect(overdue.rows).toEqual([]);
  });

  it("isolates occurrence reads and writes from outsiders", async () => {
    await authenticateAs(OUTSIDER_ID);
    const visible = await database.query("select id from public.chore_occurrences");
    expect(visible.rows).toHaveLength(0);
    await expect(database.query(`
      insert into public.chore_occurrences (household_id, chore_id, scheduled_date, original_scheduled_date)
      values ('${householdId}', '${choreId}', '2026-10-01', '2026-10-01')
    `)).rejects.toThrow(/row-level security/i);
  });

  it("rejects mismatched chore and household ids at the database boundary", async () => {
    await authenticateAs(OUTSIDER_ID);
    const other = await database.query<{ id: string }>("select * from public.create_household('Other occurrence home')");
    await database.exec("reset role");
    await expect(database.query(`
      insert into public.chore_occurrences (household_id, chore_id, scheduled_date, original_scheduled_date)
      values ('${other.rows[0]!.id}', '${choreId}', '2026-10-01', '2026-10-01')
    `)).rejects.toThrow(/foreign key/i);
  });
});
