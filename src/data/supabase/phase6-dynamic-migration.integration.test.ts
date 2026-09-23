// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER = "74444444-4444-4444-8444-444444444444";
const LEADING_MIGRATION = "20260922120000_phase6_leading_reminders.sql";
const DYNAMIC_MIGRATION = "20260922180000_phase6_dynamic_notification_builder.sql";
let db: PGlite;

async function applyMigration(file: string) {
  await db.exec(await readFile(
    path.resolve(import.meta.dirname, `../../../supabase/migrations/${file}`),
    "utf8",
  ));
}

describe("Phase 6 dynamic reminder migration", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon noinherit; create role authenticated noinherit; create role service_role noinherit;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        email text,
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    `);
    for (const file of [
      "20260918160000_phase1_auth_households.sql",
      "20260918190000_phase2_chore_definitions.sql",
      "20260918220000_phase3_chore_occurrences.sql",
      "20260919010000_phase4_completion_history_realtime.sql",
      "20260919140000_phase5_push_reminders.sql",
      LEADING_MIGRATION,
    ]) await applyMigration(file);
  });

  afterAll(async () => db.close());

  it("preserves deployed lead-day reminders while converting them to dynamic offsets", async () => {
    await db.exec(`insert into auth.users values
      ('${OWNER}', 'migration@example.com', '{"display_name":"Migration owner"}')`);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${OWNER}', false);`);

    const household = await db.query<{ id: string }>("select id from public.create_household('Migration home')");
    const householdId = household.rows[0]!.id;
    const chore = await db.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Migration chore', null, 'checklist', 'amber', 'interval_days', 14,
        '2026-09-22', null::smallint[], null,
        array['2026-09-22','2026-10-06']::date[])
    `);
    const choreId = chore.rows[0]!.id;

    await db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}', '${choreId}', true, 'due_time', '08:30', 'America/Chicago', array[0,2,7])`);
    await db.exec("reset role");
    await db.exec(`
      update public.chore_reminders
      set enabled = false, selected = false
      where chore_id = '${choreId}' and lead_days = 7
    `);

    const before = await db.query<{
      id: string;
      lead_days: number;
      user_id: string;
      enabled: boolean;
      selected: boolean;
      local_time: string;
      timezone: string;
    }>(`
      select id, lead_days, user_id, enabled, selected, local_time::text, timezone
      from public.chore_reminders
      where chore_id = '${choreId}'
      order by lead_days
    `);

    await applyMigration(DYNAMIC_MIGRATION);

    const after = await db.query<{
      id: string;
      offset_value: number;
      offset_unit: string;
      user_id: string;
      enabled: boolean;
      selected: boolean;
      local_time: string;
      timezone: string;
    }>(`
      select id, offset_value, offset_unit, user_id, enabled, selected, local_time::text, timezone
      from public.chore_reminders
      where chore_id = '${choreId}'
      order by offset_value
    `);

    expect(after.rows).toEqual(before.rows.map(({ lead_days, ...row }) => ({
      ...row,
      offset_value: lead_days,
      offset_unit: "day",
    })));
    expect((await db.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'chore_reminders' and column_name = 'lead_days'
    `)).rows).toHaveLength(0);

    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${OWNER}', false);`);
    const saved = await db.query<{ offset_value: number; offset_unit: string }>(`
      select offset_value, offset_unit from public.upsert_chore_reminder_v2(
        '${householdId}', '${choreId}', true, 'due_time', 'America/Chicago',
        '[{"offset_value":1,"offset_unit":"week","local_time":"09:00"}]'::jsonb)
    `);
    expect(saved.rows).toEqual([{ offset_value: 1, offset_unit: "week" }]);
  });
});
