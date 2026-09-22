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
let choreId: string;
let occurrenceIds: string[];

async function auth(userId: string, role = "authenticated") {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub', '${userId}', false);`);
}

describe("Phase 5 personal reminders and delivery security", () => {
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
      "20260919140000_phase5_push_reminders.sql",
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
    const chore = await db.query<{ id: string }>(`
      select id from public.create_chore_with_occurrences(
        '${householdId}', 'Clean bathroom', null, 'bathtub', 'sky', 'weekly', 1,
        '2026-09-19', array[6]::smallint[], null,
        array['2026-09-19','2026-09-26','2026-10-03','2026-10-10','2027-01-09']::date[])
    `);
    choreId = chore.rows[0]!.id;
    occurrenceIds = (await db.query<{ id: string }>(`select id from public.chore_occurrences where chore_id='${choreId}' order by scheduled_date`)).rows.map((row) => row.id);
  });

  afterAll(async () => db.close());

  it("keeps reminder preferences independent for two users on one shared chore", async () => {
    await auth(OWNER);
    await db.query(`select * from public.upsert_chore_reminder('${householdId}','${choreId}',true,'due_time','10:00','America/Chicago')`);
    await auth(MEMBER);
    await db.query(`select * from public.upsert_chore_reminder('${householdId}','${choreId}',true,'due_time','11:30','America/Los_Angeles')`);
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(1);
    await auth(OWNER);
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(1);
    await db.exec("reset role");
    const rows = await db.query<{ user_id: string; local_time: string }>("select user_id, local_time::text from public.chore_reminders order by local_time");
    expect(rows.rows).toEqual([{ user_id: OWNER, local_time: "10:00:00" }, { user_id: MEMBER, local_time: "11:30:00" }]);
  });

  it("supports multiple devices, own removal, and prevents spoofed subscriptions", async () => {
    await auth(OWNER);
    await db.query(`select * from public.register_push_subscription('https://push.example/device-one','p256dh-one','auth-one-value','Phone','agent')`);
    await db.query(`select * from public.register_push_subscription('https://push.example/device-two','p256dh-two','auth-two-value','Tablet','agent')`);
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
    const winter = await db.query<{ scheduled_for: string }>("select scheduled_for::text from public.claim_due_reminder_deliveries('2027-01-09T16:02:00Z')");
    expect(Date.parse(winter.rows[0]!.scheduled_for)).toBe(Date.parse("2027-01-09T16:00:00Z"));
  });

  it("suppresses completed early, skipped, paused, and disabled reminders", async () => {
    await auth(MEMBER);
    await db.query(`select * from public.complete_occurrence('${occurrenceIds[1]}','${householdId}')`);
    await db.query(`select * from public.skip_occurrence('${occurrenceIds[2]}','${householdId}')`);
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-09-26T18:32:00Z')")).rows).toHaveLength(0);
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-10-03T18:32:00Z')")).rows).toHaveLength(0);
    await auth(MEMBER);
    await db.query(`select * from public.upsert_chore_reminder('${householdId}','${choreId}',false,'due_time','11:30','America/Chicago')`);
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-10-10T18:32:00Z')")).rows).toHaveLength(0);
    await auth(OWNER);
    await db.query(`select * from public.set_chore_active_with_occurrences('${choreId}','${householdId}',false,'2026-10-10',array[]::date[])`);
    await db.exec("reset role; set role service_role");
    expect((await db.query("select * from public.claim_due_reminder_deliveries('2026-10-10T15:02:00Z')")).rows).toHaveLength(0);
  });

  it("isolates reminders and subscriptions from outsiders", async () => {
    await auth(OUTSIDER);
    expect((await db.query("select id from public.chore_reminders")).rows).toHaveLength(0);
    expect((await db.query("select id from public.push_subscriptions")).rows).toHaveLength(0);
    await expect(db.query(`select * from public.upsert_chore_reminder('${householdId}','${choreId}',true,'due_time','09:00','America/Chicago')`)).rejects.toThrow(/not authorized|permission denied/i);
  });
});
