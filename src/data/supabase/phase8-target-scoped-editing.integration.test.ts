// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER = "81111111-1111-4111-8111-111111111111";
const MEMBER = "82222222-2222-4222-8222-222222222222";
const OUTSIDER = "83333333-3333-4333-8333-333333333333";
type Chore = { id: string; routine_id: string; recurrence_type: string; anchor_date: string };
type Step = { id: string; title: string };
let db: PGlite; let home: string; let otherHome: string; let first: Chore; let second: Chore; let steps: Step[]; let historicId: string;

async function auth(user = OWNER) { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`); }
function planTarget(roomId: string, key: string, day = 3) {
  return { key, room_id: roomId, variant_key: null, recurrence_type: "weekly", interval_count: 1, anchor_date: "2026-10-07",
    weekdays: [day], day_of_month: null, occurrence_dates: day === 3 ? ["2026-10-07", "2026-10-14", "2026-10-21"] : ["2026-10-08", "2026-10-15", "2026-10-22"] };
}
async function checklist(choreId: string, date: string) {
  return (await db.query<{ title: string; completed_at: string | null }>(`select step.title,step.completed_at from public.occurrence_subtasks step
    join public.chore_occurrences occurrence on occurrence.id=step.occurrence_id where occurrence.chore_id=$1 and occurrence.scheduled_date=$2 order by step.position`, [choreId, date])).rows;
}
async function updateTarget(choreId: string, applicable: string[], day = 4, anchor = "2026-10-15") {
  return db.query("select * from public.update_category_target($1,$2,'weekly',1,$3,array[$4]::smallint[],null,array['2026-10-15','2026-10-22']::date[],$5::uuid[],'2026-10-12')",
    [home, choreId, anchor, day, applicable]);
}

describe("target-scoped Category editing", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon noinherit; create role authenticated noinherit; create role service_role noinherit;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    const directory = path.resolve(import.meta.dirname, "../../../supabase/migrations");
    for (const file of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort()) await db.exec(await readFile(path.join(directory, file), "utf8"));
    await db.exec(`insert into auth.users values('${OWNER}','owner@example.com','{}'),('${MEMBER}','member@example.com','{}'),('${OUTSIDER}','outsider@example.com','{}')`);
    await auth();
    const household = (await db.query<{ id: string; invite_code: string }>("select * from public.create_household('Target home')")).rows[0]!;
    home = household.id;
    await auth(MEMBER); await db.query("select * from public.join_household($1)", [household.invite_code]);
    await auth(OUTSIDER); otherHome = (await db.query<{ id: string }>("select id from public.create_household('Other home')")).rows[0]!.id;
    await auth();
    const roomA = (await db.query<{ id: string }>("insert into public.rooms(household_id,name) values($1,'Upstairs Bathroom') returning id", [home])).rows[0]!.id;
    const roomB = (await db.query<{ id: string }>("insert into public.rooms(household_id,name) values($1,'Downstairs Bathroom') returning id", [home])).rows[0]!.id;
    const saved = (await db.query<Chore>("select * from public.save_chore_plan($1,null,$2::jsonb,'2026-10-12')", [home, JSON.stringify({
      kind: "category", name: "Clean Bathroom", description: null, icon_key: "bathtub", accent_key: "sky",
      targets: [planTarget(roomA, "up"), planTarget(roomB, "down")], variants: [],
      subtasks: [{ id: null, title: "Clean toilet" }, { id: null, title: "Clean shower", excludedTargets: ["down"] }],
    })])).rows;
    [first, second] = saved;
    steps = (await db.query<Step>("select id,title from public.routine_subtasks where routine_id=$1 order by position", [first!.routine_id])).rows;
    historicId = (await db.query<{ id: string }>("select id from public.chore_occurrences where chore_id=$1 and scheduled_date='2026-10-07'", [first!.id])).rows[0]!.id;
    await db.query("select * from public.complete_occurrence($1,$2)", [historicId, home]);
    await db.query("select * from public.upsert_chore_reminder_v2($1,$2,true,'due_time','America/Chicago',$3::jsonb)", [home, first!.id, JSON.stringify([{ offset_value: 0, offset_unit: "day", local_time: "09:00" }])]);
  });
  afterAll(async () => db.close());

  it("updates one member target's schedule and applicability while siblings, history and reminders remain intact", async () => {
    const siblingOccurrences = await db.query("select id,scheduled_date::text from public.chore_occurrences where chore_id=$1 order by scheduled_date", [second!.id]);
    const countBefore = (await db.query("select id from public.chores where routine_id=$1", [first!.routine_id])).rows.length;
    const historicSteps = await checklist(first!.id, "2026-10-07");
    await auth(MEMBER);
    await updateTarget(first!.id, [steps[0]!.id]);
    const firstSchedule = (await db.query<{ anchor_date: string; weekdays: number[] }>("select anchor_date::text,weekdays from public.chores where id=$1", [first!.id])).rows[0]!;
    expect(firstSchedule).toEqual({ anchor_date: "2026-10-15", weekdays: [4] });
    expect((await db.query("select anchor_date::text,weekdays from public.chores where id=$1", [second!.id])).rows[0]).toEqual({ anchor_date: "2026-10-07", weekdays: [3] });
    expect(await checklist(first!.id, "2026-10-15")).toEqual([{ title: "Clean toilet", completed_at: null }]);
    expect(await checklist(second!.id, "2026-10-14")).toEqual([{ title: "Clean toilet", completed_at: null }]);
    expect(await checklist(first!.id, "2026-10-07")).toEqual(historicSteps);
    expect((await db.query("select id,scheduled_date::text from public.chore_occurrences where chore_id=$1 order by scheduled_date", [second!.id])).rows).toEqual(siblingOccurrences.rows);
    expect((await db.query("select id from public.chores where routine_id=$1", [first!.routine_id])).rows).toHaveLength(countBefore);
    await auth();
    expect((await db.query("select chore_id from public.chore_reminders where chore_id=$1", [first!.id])).rows).toHaveLength(1);
  });

  it("rejects unauthorized and cross-Category subtasks atomically", async () => {
    await auth(OUTSIDER);
    await expect(updateTarget(first!.id, [steps[0]!.id])).rejects.toThrow(/membership/i);
    await auth();
    const other = (await db.query<Chore>("select * from public.save_chore_plan($1,null,$2::jsonb,'2026-10-12')", [home, JSON.stringify({
      kind: "category", name: "Other Category", description: null, icon_key: "bathtub", accent_key: "sky", variants: [], subtasks: [{ id: null, title: "Foreign" }],
      targets: [{ key: "only", room_id: null, variant_key: null, recurrence_type: "weekly", interval_count: 1, anchor_date: "2026-10-07", weekdays: [3], day_of_month: null, occurrence_dates: ["2026-10-14"] }],
    })])).rows[0]!;
    const foreignStep = (await db.query<Step>("select id,title from public.routine_subtasks where routine_id=$1", [other.routine_id])).rows[0]!;
    await auth(OUTSIDER);
    const outside = (await db.query<Chore>("select * from public.save_chore_plan($1,null,$2::jsonb,'2026-10-12')", [otherHome, JSON.stringify({
      kind: "category", name: "Outside Category", description: null, icon_key: "bathtub", accent_key: "sky", variants: [], subtasks: [{ id: null, title: "Outside" }],
      targets: [{ key: "only", room_id: null, variant_key: null, recurrence_type: "weekly", interval_count: 1, anchor_date: "2026-10-07", weekdays: [3], day_of_month: null, occurrence_dates: ["2026-10-14"] }],
    })])).rows[0]!;
    const outsideStep = (await db.query<Step>("select id,title from public.routine_subtasks where routine_id=$1", [outside.routine_id])).rows[0]!;
    await auth();
    const before = (await db.query("select anchor_date::text from public.chores where id=$1", [first!.id])).rows;
    await expect(updateTarget(first!.id, [foreignStep.id], 1, "2026-10-20")).rejects.toThrow(/not in this category/i);
    await expect(updateTarget(first!.id, [outsideStep.id], 1, "2026-10-20")).rejects.toThrow(/not in this category/i);
    await expect(db.query("select * from public.update_category_target($1,$2,'weekly',1,'2026-10-20',array[1]::smallint[],null,array['2026-10-20']::date[],$3::uuid[],'2026-10-12')", [otherHome, first!.id, [steps[0]!.id]])).rejects.toThrow(/membership/i);
    expect((await db.query("select anchor_date::text from public.chores where id=$1", [first!.id])).rows).toEqual(before);
  });
});
