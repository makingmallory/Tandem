// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const OWNER = "81111111-1111-4111-8111-111111111111";
const MEMBER = "82222222-2222-4222-8222-222222222222";
const OUTSIDER = "83333333-3333-4333-8333-333333333333";
type Target = { id: string; room_id: string | null; routine_id: string | null; retired_at: string | null; is_active: boolean };
let db: PGlite; let home: string; let otherHome: string; let master: string; let downstairs: string;
let legacy: string; let targets: Target[]; let completedId: string; let eventBefore: unknown;
let tasks: Array<{ id: string; title: string; position: number }>;
async function auth(user = OWNER) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false)`);
}
function schedule(roomId: string | null, day = 3, anchor = "2026-10-14") {
  return { room_id: roomId, recurrence_type: "weekly", interval_count: 1, anchor_date: anchor,
    weekdays: [day], day_of_month: null, occurrence_dates: day === 3 ? ["2026-10-14", "2026-10-21", "2026-10-28"] : ["2026-10-15", "2026-10-22", "2026-10-29"] };
}
async function save(selected: ReturnType<typeof schedule>[], subtasks: Array<{ id: string | null; title: string }> = [], id: string | null = null) {
  return (await db.query<Target>("select * from public.save_chore_plan($1,$2,$3::jsonb,'2026-10-12')",
    [home, id, JSON.stringify({ name: "Clean Bathroom", description: null, icon_key: "bathtub", accent_key: "sky", targets: selected, subtasks })])).rows;
}
async function occurrences(choreId: string) {
  return (await db.query<{ id: string; scheduled_date: string; status: string }>(
    "select id, scheduled_date::text, status from public.chore_occurrences where chore_id=$1 order by scheduled_date", [choreId])).rows;
}
async function steps() {
  return (await db.query<{ id: string; title: string; position: number }>(
    "select id,title,position from public.routine_subtasks where routine_id=$1 order by position", [targets[0]!.routine_id])).rows;
}

describe("Phase 8 rooms, routines, per-room scheduling and retirement", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon noinherit; create role authenticated noinherit; create role service_role noinherit;
      create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;`);
    const directory = path.resolve(import.meta.dirname, "../../../supabase/migrations");
    for (const file of (await readdir(directory)).filter((file) => file.endsWith(".sql") && !file.startsWith("20261012")).sort()) {
      await db.exec(await readFile(path.join(directory, file), "utf8"));
    }
    await db.exec(`insert into auth.users values ('${OWNER}','owner8@example.com','{}'),
      ('${MEMBER}','member8@example.com','{}'), ('${OUTSIDER}','outsider8@example.com','{}')`);
    await auth();
    const household = (await db.query<{ id: string; invite_code: string }>("select * from public.create_household('Rooms home')")).rows[0]!;
    home = household.id;
    await auth(MEMBER); await db.query("select * from public.join_household($1)", [household.invite_code]);
    await auth(OUTSIDER); otherHome = (await db.query<{ id: string }>("select * from public.create_household('Other home')")).rows[0]!.id;
    await auth();
    legacy = (await db.query<{ id: string }>(`select id from public.create_chore_with_occurrences(
      '${home}', 'Existing chore', null, 'home','mint','daily',1,'2026-10-12',null,null,array['2026-10-12']::date[])`)).rows[0]!.id;
    await db.exec("reset role");
    await db.exec(await readFile(path.join(directory, "20261012000000_phase8_rooms_routines.sql"), "utf8"));
    await auth();
  });
  afterAll(async () => db.close());

  it("preserves existing roomless standalone chores and original RPCs", async () => {
    expect((await db.query("select room_id, routine_id, retired_at from public.chores where id=$1", [legacy])).rows)
      .toEqual([{ room_id: null, routine_id: null, retired_at: null }]);
    expect(await occurrences(legacy)).toHaveLength(1);
    await db.query("select * from public.complete_occurrence($1,$2)", [(await occurrences(legacy))[0]!.id, home]);
    expect((await occurrences(legacy))[0]!.status).toBe("completed");
  });
  it("creates custom rooms with normalized household uniqueness", async () => {
    master = (await db.query<{ id: string }>("insert into public.rooms(household_id,name) values($1,'Master Bathroom') returning id", [home])).rows[0]!.id;
    downstairs = (await db.query<{ id: string }>("insert into public.rooms(household_id,name) values($1,'Downstairs Bathroom') returning id", [home])).rows[0]!.id;
    await expect(db.query("insert into public.rooms(household_id,name) values($1,' master bathroom ')", [home])).rejects.toThrow(/duplicate key/i);
  });
  it("applies the same Wednesday schedule to separate room chores", async () => {
    targets = await save([schedule(master), schedule(downstairs)], [{ id: null, title: "Clean toilet" }, { id: null, title: "Wipe counters" }]);
    expect(targets).toHaveLength(2);
    expect(targets[0]!.routine_id).toBe(targets[1]!.routine_id);
    expect(targets[0]!.id).not.toBe(targets[1]!.id);
    expect((await occurrences(targets[0]!.id)).map((o) => o.scheduled_date)).toEqual((await occurrences(targets[1]!.id)).map((o) => o.scheduled_date));
    tasks = await steps();
    expect(tasks.map((t) => t.title)).toEqual(["Clean toilet", "Wipe counters"]);
  });
  it("completes one room independently and snapshots room history", async () => {
    await auth(MEMBER);
    completedId = (await occurrences(targets[0]!.id))[0]!.id;
    await db.query("select * from public.complete_occurrence($1,$2)", [completedId, home]);
    expect((await occurrences(targets[0]!.id))[0]!.status).toBe("completed");
    expect((await occurrences(targets[1]!.id))[0]!.status).toBe("scheduled");
    eventBefore = (await db.query("select * from public.activity_events where occurrence_id=$1", [completedId])).rows;
    expect((eventBefore as Array<{ metadata: { room_name: string } }>)[0]!.metadata.room_name).toBe("Master Bathroom");
  });
  it("edits only the downstairs schedule and preserves the master anchor and occurrences", async () => {
    const before = await occurrences(targets[0]!.id);
    targets = await save([schedule(master), schedule(downstairs, 4, "2026-10-15")], tasks, targets[0]!.id);
    expect(await occurrences(targets[0]!.id)).toEqual(before);
    expect((await occurrences(targets[1]!.id)).map((o) => o.scheduled_date)).toEqual(["2026-10-15", "2026-10-22", "2026-10-29"]);
    expect((await db.query<{ anchor: string }>("select anchor_date::text as anchor from public.chores where id=$1", [targets[0]!.id])).rows[0]!.anchor).toBe("2026-10-14");
  });
  it("isolates skip and one-off rescheduling to the selected room", async () => {
    const before = await occurrences(targets[0]!.id);
    const others = await occurrences(targets[1]!.id);
    await db.query("select * from public.skip_occurrence($1,$2)", [others[0]!.id, home]);
    await db.query("select * from public.reschedule_occurrence($1,$2,'2026-10-23')", [others[1]!.id, home]);
    expect(await occurrences(targets[0]!.id)).toEqual(before);
    expect((await db.query<{ anchor: string }>("select anchor_date::text as anchor from public.chores where id=$1", [targets[1]!.id])).rows[0]!.anchor).toBe("2026-10-15");
  });
  it("supports adding, renaming, removing and reordering steps without changing history or occurrence IDs", async () => {
    const before = await occurrences(targets[0]!.id);
    await save([schedule(master), schedule(downstairs, 4, "2026-10-15")], [tasks[1]!, tasks[0]!], targets[0]!.id);
    expect((await steps()).map((task) => task.id)).toEqual([tasks[1]!.id, tasks[0]!.id]);
    await save([schedule(master), schedule(downstairs, 4, "2026-10-15")],
      [{ ...tasks[1]!, title: "Wipe surfaces" }, { id: null, title: "Mop floor" }], targets[0]!.id);
    const updated = await steps();
    expect(updated.map(({ title, position }) => ({ title, position }))).toEqual([
      { title: "Wipe surfaces", position: 0 }, { title: "Mop floor", position: 1 }]);
    expect(updated[0]!.id).toBe(tasks[1]!.id);
    expect(await occurrences(targets[0]!.id)).toEqual(before);
    expect((await db.query("select * from public.activity_events where occurrence_id=$1", [completedId])).rows).toEqual(eventBefore);
    tasks = updated;
  });
  it("allows pause and resume without retirement", async () => {
    await db.query("select * from public.set_chore_active_with_occurrences($1,$2,false,'2026-10-12',array[]::date[])", [targets[0]!.id, home]);
    await db.query("select * from public.set_chore_active_with_occurrences($1,$2,true,'2026-10-12',array['2026-10-21','2026-10-28']::date[])", [targets[0]!.id, home]);
    expect((await db.query("select is_active,retired_at from public.chores where id=$1", [targets[0]!.id])).rows).toEqual([{ is_active: true, retired_at: null }]);
  });
  it("retains per-chore personal reminder isolation", async () => {
    await auth();
    const definitions = JSON.stringify([{ offset_value: 0, offset_unit: "day", local_time: "09:00" }]);
    await db.query("select * from public.upsert_chore_reminder_v2($1,$2,true,'due_time','America/Chicago',$3::jsonb)", [home, targets[0]!.id, definitions]);
    expect((await db.query("select chore_id from public.chore_reminders")).rows).toEqual([{ chore_id: targets[0]!.id }]);
    await db.query("select * from public.upsert_chore_reminder_v2($1,$2,true,'due_time','America/Chicago',$3::jsonb)", [home, targets[1]!.id, definitions]);
  });
  it("enforces household RLS and composite links, including hostile routine saves", async () => {
    await auth(OUTSIDER);
    for (const table of ["rooms", "routines", "routine_subtasks"]) expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    await expect(db.query("insert into public.rooms(household_id,name) values($1,'Intrusion')", [home])).rejects.toThrow(/row-level security/i);
    expect((await db.query("update public.rooms set name='Hacked' where id=$1 returning id", [master])).rows).toHaveLength(0);
    await expect(db.query("select public.archive_room($1,$2)", [home, master])).rejects.toThrow(/membership/i);
    await expect(save([schedule(master)])).rejects.toThrow(/membership/i);
    await expect(db.query("select public.retire_chore($1,$2,true)", [home, targets[0]!.id])).rejects.toThrow(/membership/i);
    await expect(db.query("update public.routines set name='Hacked' where id=$1", [targets[0]!.routine_id])).rejects.toThrow(/permission denied/i);
    await expect(db.query("delete from public.routine_subtasks where id=$1", [tasks[0]!.id])).rejects.toThrow(/permission denied/i);
    const outsiderRoom = (await db.query<{ id: string }>("insert into public.rooms(household_id,name) values($1,'Master Bathroom') returning id", [otherHome])).rows[0]!.id;
    await auth();
    await expect(save([schedule(outsiderRoom)])).rejects.toThrow(/Room unavailable/i);
    await expect(save([schedule(master)], [{ id: "84444444-4444-4444-8444-444444444444", title: "Spoofed step" }], targets[0]!.id)).rejects.toThrow(/Subtask not in/i);
    await db.exec("reset role");
    await expect(db.query("update public.chores set room_id=$1 where id=$2", [outsiderRoom, targets[0]!.id])).rejects.toThrow(/foreign key/i);
    const outsiderRoutine = (await db.query<{ id: string }>("insert into public.routines(household_id,name) values($1,'Other routine') returning id", [otherHome])).rows[0]!.id;
    await expect(db.query("update public.chores set routine_id=$1 where id=$2", [outsiderRoutine, targets[0]!.id])).rejects.toThrow(/foreign key/i);
    await expect(db.query("insert into public.routine_subtasks(household_id,routine_id,title,position) values($1,$2,'Cross household',0)", [home, outsiderRoutine])).rejects.toThrow(/foreign key/i);
    await auth();
  });
  it("rolls a whole routine edit back if a target or subtask is invalid", async () => {
    const before = await occurrences(targets[0]!.id);
    const beforeTasks = await steps();
    await expect(save([schedule(master, 4), schedule(downstairs, 4, "2026-10-15")],
      [{ id: "84444444-4444-4444-8444-444444444444", title: "Invalid step" }], targets[0]!.id)).rejects.toThrow(/Subtask not in/i);
    expect(await occurrences(targets[0]!.id)).toEqual(before);
    expect(await steps()).toEqual(beforeTasks);
  });
  it("removes only one room target and preserves completions", async () => {
    const otherBefore = await occurrences(targets[1]!.id);
    await save([schedule(downstairs, 4, "2026-10-15")], tasks, targets[0]!.id);
    expect(await occurrences(targets[1]!.id)).toEqual(otherBefore);
    expect((await occurrences(targets[0]!.id)).filter((o) => o.status === "scheduled")).toHaveLength(0);
    expect((await db.query("select id from public.chores where id=$1 and retired_at is null", [targets[0]!.id])).rows).toHaveLength(0);
    expect((await db.query("select occurrence_id from public.occurrence_completions where occurrence_id=$1", [completedId])).rows).toHaveLength(1);
    expect((await db.query("select * from public.activity_events where occurrence_id=$1", [completedId])).rows).toEqual(eventBefore);
  });
  it("prevents removed targets from resuming, scheduling or claiming reminders", async () => {
    await expect(db.query("select * from public.set_chore_active_with_occurrences($1,$2,true,'2026-10-12',array['2026-10-21']::date[])", [targets[0]!.id, home])).rejects.toThrow(/removed/i);
    await db.exec("reset role");
    await expect(db.query("insert into public.chore_occurrences(household_id,chore_id,scheduled_date,original_scheduled_date) values($1,$2,'2026-11-01','2026-11-01')", [home, targets[0]!.id])).rejects.toThrow(/Removed chores/i);
    const claims = await db.query<{ chore_id: string }>("select chore_id from public.claim_due_reminder_deliveries('2026-10-21T14:00:00Z')");
    expect(claims.rows.some((row) => row.chore_id === targets[0]!.id)).toBe(false);
    await auth();
  });
  it("can add a new room later and delete a whole routine together", async () => {
    const newTargets = await save([schedule(master), schedule(downstairs, 4, "2026-10-15")], tasks, targets[1]!.id);
    expect(newTargets[0]!.id).not.toBe(targets[0]!.id);
    expect(newTargets[1]!.id).toBe(targets[1]!.id);
    await db.query("select public.retire_chore($1,$2,true)", [home, newTargets[1]!.id]);
    expect((await db.query("select id from public.chores where routine_id=$1 and retired_at is null", [targets[0]!.routine_id])).rows).toHaveLength(0);
    expect((await db.query("select * from public.activity_events where occurrence_id=$1", [completedId])).rows).toEqual(eventBefore);
  });
  it("archives a room safely, leaving its historical name and chore references readable", async () => {
    const one = await save([schedule(master)]);
    const occurrence = (await occurrences(one[0]!.id))[0]!;
    await db.query("select * from public.complete_occurrence($1,$2)", [occurrence.id, home]);
    await db.query("select public.archive_room($1,$2)", [home, master]);
    expect((await db.query("select completion.id from public.occurrence_completions completion join public.chore_occurrences occurrence on occurrence.id=completion.occurrence_id join public.chores chore on chore.id=occurrence.chore_id join public.rooms room on room.id=chore.room_id where occurrence.id=$1 and room.name='Master Bathroom'", [occurrence.id])).rows).toHaveLength(1);
    expect((await db.query("select id from public.rooms where id=$1 and archived_at is null", [master])).rows).toHaveLength(0);
    await expect(save([schedule(master)])).rejects.toThrow(/Room unavailable/i);
    expect((await db.query("select is_active from public.chores where id=$1", [one[0]!.id])).rows).toEqual([{ is_active: false }]);
  });
  it("deletes a roomless standalone chore while preserving its completion and blocking future work", async () => {
    await db.query("select public.retire_chore($1,$2,false)", [home, legacy]);
    expect((await db.query("select id from public.chores where id=$1 and retired_at is null", [legacy])).rows).toHaveLength(0);
    expect((await occurrences(legacy))[0]!.status).toBe("completed");
    expect((await db.query("select completion.id from public.occurrence_completions completion join public.chore_occurrences occurrence on occurrence.id=completion.occurrence_id where occurrence.chore_id=$1", [legacy])).rows).toHaveLength(1);
    await expect(db.query("select * from public.set_chore_active_with_occurrences($1,$2,true,'2026-10-12',array[]::date[])", [legacy, home])).rejects.toThrow(/removed/i);
  });
});
