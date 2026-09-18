// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "33333333-3333-4333-8333-333333333333";

let database: PGlite;
let inviteCode: string;

async function authenticateAs(userId: string) {
  await database.exec(`
    reset role;
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `);
}

async function countRows(table: "profiles" | "households" | "household_members") {
  const result = await database.query<{ count: number }>(
    `select count(*)::integer as count from public.${table}`,
  );
  return result.rows[0]?.count ?? -1;
}

describe("Phase 1 migration and RLS", () => {
  beforeAll(async () => {
    database = new PGlite();
    const migrationPath = path.resolve(
      import.meta.dirname,
      "../../../supabase/migrations/20260918160000_phase1_auth_households.sql",
    );
    const migration = await readFile(migrationPath, "utf8");

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
      as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `);
    await database.exec(migration);

    await database.exec(`
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ('${OWNER_ID}', 'owner@example.com', '{"display_name":"Owner"}'),
        ('${MEMBER_ID}', 'member@example.com', '{"display_name":"Member"}'),
        ('${OUTSIDER_ID}', 'outsider@example.com', '{"display_name":"Outsider"}');
    `);

    await authenticateAs(OWNER_ID);
    const created = await database.query<{ invite_code: string }>(
      "select invite_code from public.create_household('Owner and Member')",
    );
    inviteCode = created.rows[0]!.invite_code;
  });

  afterAll(async () => {
    await database.close();
  });

  it("creates a profile for each auth user", async () => {
    await database.exec("reset role");
    expect(await countRows("profiles")).toBe(3);
  });

  it("hides the household, members, and owner profile from an outsider", async () => {
    await authenticateAs(MEMBER_ID);
    expect(await countRows("households")).toBe(0);
    expect(await countRows("household_members")).toBe(0);

    const profiles = await database.query<{ id: string }>("select id from public.profiles");
    expect(profiles.rows.map(({ id }) => id)).toEqual([MEMBER_ID]);
  });

  it("prevents an outsider from updating another household", async () => {
    await authenticateAs(MEMBER_ID);
    const result = await database.query("update public.households set name = 'Hacked' returning id");
    expect(result.rows).toHaveLength(0);
  });

  it("denies direct household inserts", async () => {
    await authenticateAs(MEMBER_ID);
    await expect(
      database.query(
        `insert into public.households (name, created_by) values ('Bypass', '${MEMBER_ID}')`,
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("joins through the invite and then exposes only shared household data", async () => {
    await authenticateAs(MEMBER_ID);
    await database.query("select * from public.join_household($1)", [inviteCode]);

    expect(await countRows("households")).toBe(1);
    expect(await countRows("household_members")).toBe(2);
    expect(await countRows("profiles")).toBe(2);

    const update = await database.query(
      "update public.households set name = 'Our shared home' returning id",
    );
    expect(update.rows).toHaveLength(1);
  });

  it("reveals nothing for an invalid invite code", async () => {
    await authenticateAs(OUTSIDER_ID);
    await expect(
      database.query("select * from public.join_household('FFFFFFFFFFFF')"),
    ).rejects.toThrow("invite code was not found");
    expect(await countRows("households")).toBe(0);
  });

  it("enforces one active household per user", async () => {
    await authenticateAs(MEMBER_ID);
    await expect(
      database.query("select * from public.create_household('A second home')"),
    ).rejects.toThrow("already belong");
  });

  it("keeps a third user isolated from the joined household", async () => {
    await authenticateAs(OUTSIDER_ID);
    expect(await countRows("households")).toBe(0);
    expect(await countRows("household_members")).toBe(0);

    const result = await database.query("update public.households set name = 'Nope' returning id");
    expect(result.rows).toHaveLength(0);
  });
});
