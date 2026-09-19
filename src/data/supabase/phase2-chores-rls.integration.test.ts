// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "33333333-3333-4333-8333-333333333333";

let database: PGlite;
let householdId: string;
let outsiderHouseholdId: string;
let choreId: string;

async function authenticateAs(userId: string) {
  await database.exec(`
    reset role;
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `);
}

async function insertChore(targetHouseholdId: string, creatorId: string, name = "Take out trash") {
  return database.query<{ id: string }>(`
    insert into public.chores (
      household_id, name, icon_key, accent_key, recurrence_type,
      interval_count, anchor_date, weekdays, created_by
    ) values (
      '${targetHouseholdId}', '${name}', 'trash', 'amber', 'weekly',
      1, '2026-09-18', array[1]::smallint[], '${creatorId}'
    ) returning id
  `);
}

describe("Phase 2 chore migration and RLS", () => {
  beforeAll(async () => {
    database = new PGlite();
    const migrationPaths = [
      "../../../supabase/migrations/20260918160000_phase1_auth_households.sql",
      "../../../supabase/migrations/20260918190000_phase2_chore_definitions.sql",
    ];

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
    for (const migrationPath of migrationPaths) {
      await database.exec(await readFile(path.resolve(import.meta.dirname, migrationPath), "utf8"));
    }

    await database.exec(`
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ('${OWNER_ID}', 'owner@example.com', '{"display_name":"Owner"}'),
        ('${MEMBER_ID}', 'member@example.com', '{"display_name":"Member"}'),
        ('${OUTSIDER_ID}', 'outsider@example.com', '{"display_name":"Outsider"}');
    `);

    await authenticateAs(OWNER_ID);
    const ownerHome = await database.query<{ id: string; invite_code: string }>(
      "select * from public.create_household('Shared home')",
    );
    householdId = ownerHome.rows[0]!.id;

    await authenticateAs(MEMBER_ID);
    await database.query("select * from public.join_household($1)", [ownerHome.rows[0]!.invite_code]);

    await authenticateAs(OUTSIDER_ID);
    const outsiderHome = await database.query<{ id: string }>(
      "select * from public.create_household('Other home')",
    );
    outsiderHouseholdId = outsiderHome.rows[0]!.id;
  });

  afterAll(async () => database.close());

  it("creates a shared chore with stable icon and accent keys", async () => {
    await authenticateAs(OWNER_ID);
    const inserted = await insertChore(householdId, OWNER_ID);
    choreId = inserted.rows[0]!.id;
    const chore = await database.query<{ icon_key: string; accent_key: string }>(
      `select icon_key, accent_key from public.chores where id = '${choreId}'`,
    );
    expect(chore.rows[0]).toEqual({ icon_key: "trash", accent_key: "amber" });
  });

  it("lets a fellow household member read and edit the chore", async () => {
    await authenticateAs(MEMBER_ID);
    const visible = await database.query<{ id: string }>("select id from public.chores");
    expect(visible.rows.map(({ id }) => id)).toContain(choreId);
    const updated = await database.query<{ name: string }>(
      `update public.chores set name = 'Bins to curb' where id = '${choreId}' returning name`,
    );
    expect(updated.rows[0]?.name).toBe("Bins to curb");
  });

  it("supports pause and resume without deleting the chore", async () => {
    await authenticateAs(MEMBER_ID);
    const paused = await database.query<{ is_active: boolean }>(
      `update public.chores set is_active = false where id = '${choreId}' returning is_active`,
    );
    expect(paused.rows[0]?.is_active).toBe(false);
    const resumed = await database.query<{ is_active: boolean }>(
      `update public.chores set is_active = true where id = '${choreId}' returning is_active`,
    );
    expect(resumed.rows[0]?.is_active).toBe(true);
  });

  it("keeps another household unable to read or mutate the chore", async () => {
    await authenticateAs(OUTSIDER_ID);
    const visible = await database.query<{ id: string }>(
      `select id from public.chores where id = '${choreId}'`,
    );
    expect(visible.rows).toHaveLength(0);
    const updated = await database.query<{ id: string }>(
      `update public.chores set name = 'Hacked' where id = '${choreId}' returning id`,
    );
    expect(updated.rows).toHaveLength(0);
  });

  it("rejects creating a chore for another household or creator", async () => {
    await authenticateAs(OUTSIDER_ID);
    await expect(insertChore(householdId, OUTSIDER_ID, "Intrusion")).rejects.toThrow(/row-level security/i);
    await expect(insertChore(outsiderHouseholdId, OWNER_ID, "Spoofed creator")).rejects.toThrow(/row-level security/i);
  });

  it("has no responsibility columns", async () => {
    await database.exec("reset role");
    const columns = await database.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'chores'
    `);
    const names = columns.rows.map(({ column_name }) => column_name);
    expect(names).not.toContain("assignment_mode");
    expect(names).not.toContain("assigned_user_id");
  });
});
