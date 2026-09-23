// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER = "71111111-1111-4111-8111-111111111111";
const MEMBER = "72222222-2222-4222-8222-222222222222";
const OUTSIDER = "73333333-3333-4333-8333-333333333333";
let db: PGlite;
let householdId: string;
let weeklyChoreId: string;
let longCadenceChoreId: string;
let dailyChoreId: string;
let monthlyChoreId: string;
let weeklyOccurrences: Record<string, string>;
let longCadenceOccurrences: Record<string, string>;

type Definition = { offset_value: number; offset_unit: "day" | "week" | "month"; local_time: string };

function definitions(value: Definition[]) {
  return `'${JSON.stringify(value)}'::jsonb`;
}

async function auth(userId: string, role = "authenticated") {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub', '${userId}', false);`);
}

async function occurrenceMap(choreId: string) {
  return Object.fromEntries((await db.query<{ id: string; scheduled_date: string }>(
    `select id, scheduled_date::text from public.chore_occurrences where chore_id='${choreId}'`,
  )).rows.map((row) => [row.scheduled_date, row.id]));
}

describe("personal reminders and delivery security", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon noinherit; create role authenticated noinherit; create role service_role noinherit;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    `);
    for (const file of [
      "20260918160000_phase1_auth_households.sql", "20260918190000_phase2_chore_definitions.sql",
      "20260918220000_phase3_chore_occurrences.sql", "20260919010000_phase4_completion_history_realtime.sql",
      "20260919140000_phase5_push_reminders.sql", "20260922120000_phase6_leading_reminders.sql",
      "20260922180000_phase6_dynamic_notification_builder.sql",
    ]) await db.exec(await readFile(path.resolve(import.meta.dirname, `../../../supabase/migrations/${file}`), "utf8"));

    await db.exec(`insert into auth.users values
      ('${OWNER}','owner5@example.com','{"display_name":"Mallory"}'),
      ('${MEMBER}','member5@example.com','{"display_name":"Nik"}'),
      ('${OUTSIDER}','outsider5@example.com','{"display_name":"Outside"}')`);
    await auth(OWNER);
    const home = await db.query<{ id: string; invite_code: string }>("select * from public.create_household('Reminder home')");
    householdId = home.rows[0]!.id;
    await auth(MEMBER);
    await db.query("select * from public.join_household($1)", [home.rows[0]!.invite_code]);
    await auth(OWNER);

    weeklyChoreId = (await db.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Clean bathroom', null, 'bathtub', 'sky', 'weekly', 1,
        '2026-09-19', array[6]::smallint[], null,
        array['2026-09-19','2026-09-26','2026-10-03','2026-10-10','2027-01-09']::date[])
    `)).rows[0]!.id;
    weeklyOccurrences = await occurrenceMap(weeklyChoreId);

    longCadenceChoreId = (await db.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Seasonal supplies', null, 'package', 'mint', 'interval_days', 52,
        '2026-02-07', null::smallint[], null,
        array['2026-02-07','2026-03-31','2026-05-22']::date[])
    `)).rows[0]!.id;
    longCadenceOccurrences = await occurrenceMap(longCadenceChoreId);

    dailyChoreId = (await db.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Daily reset', null, 'home', 'rose', 'daily', 1,
        '2026-09-22', null::smallint[], null, array['2026-09-22','2026-09-23']::date[])
    `)).rows[0]!.id;

    monthlyChoreId = (await db.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Monthly inventory', null, 'checklist', 'amber', 'monthly', 1,
        '2026-01-31', null::smallint[], 31::smallint,
        array['2026-01-31','2026-02-28','2026-03-31']::date[])
    `)).rows[0]!.id;
  });

  afterAll(async () => db.close());

  it("keeps definitions independent for two users on one shared chore", async () => {
    await auth(OWNER);
    await db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${weeklyChoreId}',true,'due_time','America/Chicago',
      ${definitions([{ offset_value: 0, offset_unit: "day", local_time: "10:00" }])})`);
    await auth(MEMBER);
    await db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${weeklyChoreId}',true,'due_time','America/Los_Angeles',
      ${definitions([{ offset_value: 0, offset_unit: "day", local_time: "11:30" }])})`);
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(1);
    await auth(OWNER);
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(1);
    await db.exec("reset role");
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(2);
  });

  it("supports multiple devices, own removal, and prevents spoofed subscriptions", async () => {
    await auth(OWNER);
    await db.query("select * from public.register_push_subscription('https://push.example/device-one','p256dh-one','auth-one-value','Phone','agent')");
    await db.query("select * from public.register_push_subscription('https://push.example/device-two','p256dh-two','auth-two-value','Tablet','agent')");
    expect((await db.query("select id from public.push_subscriptions")).rows).toHaveLength(2);
    await expect(db.query(`insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values('${OUTSIDER}','https://evil.example/x','abcdefgh','abcdefgh')`)).rejects.toThrow(/permission denied/i);
    await db.query("select public.remove_push_subscription('https://push.example/device-one')");
    expect((await db.query("select id from public.push_subscriptions")).rows).toHaveLength(1);
  });

  it("calculates due time in the reminder timezone and claims only once", async () => {
    await db.exec("reset role; set role service_role");
    const first = await db.query<{ scheduled_for: string }>("select scheduled_for::text from public.claim_due_reminder_deliveries('2026-09-19T15:02:00Z')");
    expect(first.rows).toHaveLength(1);
    expect(Date.parse(first.rows[0]!.scheduled_for)).toBe(Date.parse("2026-09-19T15:00:00Z"));
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-09-19T15:04:00Z')")).rows).toHaveLength(0);
  });

  it("uses calendar arithmetic for day, week, and month reminders", async () => {
    await db.exec("reset role");
    const arithmetic = await db.query<{ month_date: string; week_date: string; day_date: string }>(`
      select private.reminder_offset_date('2026-03-31', 1, 'month')::text month_date,
             private.reminder_offset_date('2026-03-31', 2, 'week')::text week_date,
             private.reminder_offset_date('2026-03-31', 3, 'day')::text day_date
    `);
    expect(arithmetic.rows[0]).toEqual({ month_date: "2026-02-28", week_date: "2026-03-17", day_date: "2026-03-28" });
  });

  it("delivers multiple arbitrary definitions for one occurrence exactly once each", async () => {
    await auth(OWNER);
    const configured = [
      { offset_value: 1, offset_unit: "month", local_time: "09:00" },
      { offset_value: 2, offset_unit: "week", local_time: "08:00" },
      { offset_value: 3, offset_unit: "day", local_time: "07:00" },
      { offset_value: 0, offset_unit: "day", local_time: "10:00" },
    ] satisfies Definition[];
    const saved = await db.query<{ offset_value: number; offset_unit: string; local_time: string }>(`
      select offset_value, offset_unit, local_time::text
      from public.upsert_chore_reminder_v2(
        '${householdId}','${longCadenceChoreId}',true,'due_time','America/Chicago',${definitions(configured)})
    `);
    expect(saved.rows).toHaveLength(4);

    await db.exec("reset role; set role service_role");
    for (const timestamp of [
      "2026-02-28T15:02:00Z",
      "2026-03-17T13:02:00Z",
      "2026-03-28T12:02:00Z",
      "2026-03-31T15:02:00Z",
    ]) {
      const claim = await db.query<{ occurrence_id: string }>(
        `select occurrence_id from public.claim_due_reminder_deliveries('${timestamp}')`,
      );
      expect(claim.rows).toHaveLength(1);
      expect(claim.rows[0]!.occurrence_id).toBe(longCadenceOccurrences["2026-03-31"]);
      expect((await db.query(`select * from public.claim_due_reminder_deliveries('${timestamp}')`)).rows).toHaveLength(0);
    }
    await db.exec("reset role");
    expect((await db.query(
      `select id from public.reminder_deliveries where occurrence_id='${longCadenceOccurrences["2026-03-31"]}'`,
    )).rows).toHaveLength(4);
  });

  it("rejects duplicates, cadence collisions, and leading daily reminders", async () => {
    await auth(OWNER);
    const duplicate = { offset_value: 2, offset_unit: "day", local_time: "09:00" } satisfies Definition;
    await expect(db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${longCadenceChoreId}',true,'due_time','America/Chicago',
      ${definitions([duplicate, duplicate])})`)).rejects.toThrow(/duplicate reminder/i);
    await expect(db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${weeklyChoreId}',true,'due_time','America/Chicago',
      ${definitions([{ offset_value: 1, offset_unit: "week", local_time: "09:00" }])})`)).rejects.toThrow(/overlaps this chore cadence/i);
    await expect(db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${monthlyChoreId}',true,'due_time','America/Chicago',
      ${definitions([{ offset_value: 1, offset_unit: "month", local_time: "09:00" }])})`)).rejects.toThrow(/overlaps this chore cadence/i);
    await expect(db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${dailyChoreId}',true,'due_time','America/Chicago',
      ${definitions([{ offset_value: 1, offset_unit: "day", local_time: "09:00" }])})`)).rejects.toThrow(/daily chores/i);
  });

  it("suppresses all later definitions after either member completes the occurrence", async () => {
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-04-22T14:02:00Z')")).rows).toHaveLength(1);
    await auth(MEMBER);
    await db.query(`select * from public.complete_occurrence('${longCadenceOccurrences["2026-05-22"]}','${householdId}')`);
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-05-08T13:02:00Z')")).rows).toHaveLength(0);
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-05-19T12:02:00Z')")).rows).toHaveLength(0);
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-05-22T15:02:00Z')")).rows).toHaveLength(0);
  });

  it("suppresses skipped, paused, and disabled reminders", async () => {
    await auth(MEMBER);
    await db.query(`select * from public.complete_occurrence('${weeklyOccurrences["2026-09-26"]}','${householdId}')`);
    await db.query(`select * from public.skip_occurrence('${weeklyOccurrences["2026-10-03"]}','${householdId}')`);
    await db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${weeklyChoreId}',false,'due_time','America/Chicago',
      ${definitions([{ offset_value: 0, offset_unit: "day", local_time: "11:30" }])})`);
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-09-26T16:32:00Z')")).rows).toHaveLength(0);
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-10-03T16:32:00Z')")).rows).toHaveLength(0);
    await auth(OWNER);
    await db.query(`select * from public.set_chore_active_with_occurrences('${weeklyChoreId}','${householdId}',false,'2026-10-10',array[]::date[])`);
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-10-10T15:02:00Z')")).rows).toHaveLength(0);
  });

  it("isolates reminders and subscriptions from outsiders", async () => {
    await auth(OUTSIDER);
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(0);
    expect((await db.query("select id from public.push_subscriptions")).rows).toHaveLength(0);
    await expect(db.query(`select * from public.upsert_chore_reminder_v2(
      '${householdId}','${weeklyChoreId}',true,'due_time','America/Chicago',
      ${definitions([{ offset_value: 0, offset_unit: "day", local_time: "09:00" }])})`)).rejects.toThrow(/not authorized|permission denied/i);
  });
});
