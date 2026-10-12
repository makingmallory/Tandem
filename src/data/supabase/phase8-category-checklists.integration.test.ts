// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const OWNER="91111111-1111-4111-8111-111111111111", MEMBER="92222222-2222-4222-8222-222222222222", OUTSIDER="93333333-3333-4333-8333-333333333333";
const EXTENSION="20261012120000_phase8_categories_checklists_variants.sql";
let db: PGlite; let home: string; let otherHome: string; let upstairs: string; let downstairs: string;
let bathroom: Chore[]; let originalCompletion: unknown;
type Chore={id:string; routine_id:string|null; room_id:string|null; variant_id:string|null};
type Step={id:string; source_subtask_id:string|null; title:string; position:number; completed_at:string|null; completed_by:string|null};
type Task={id:string|null; title:string; excludedTargets?:string[]};
const variant1="94111111-1111-4111-8111-111111111111", variant2="94222222-2222-4222-8222-222222222222";
async function auth(user=OWNER) { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`); }
function target(roomId: string|null, key: string, variantKey: string|null=null, day=3) {
  return {key,room_id:roomId,variant_key:variantKey,recurrence_type:"weekly",interval_count:1,anchor_date:"2026-10-07",weekdays:[day],day_of_month:null,
    occurrence_dates:day===3?["2026-10-07","2026-10-14","2026-10-21"]:["2026-10-08","2026-10-15","2026-10-22"]};
}
async function save(name:string, targets:ReturnType<typeof target>[], subtasks:Task[]=[], choreId:string|null=null,
  variants:Array<{id:string|null;key:string;name:string}>=[],kind="category") {
  return (await db.query<Chore>("select * from public.save_chore_plan($1,$2,$3::jsonb,'2026-10-12')",
    [home,choreId,JSON.stringify({kind,name,icon_key:"bathtub",accent_key:"sky",description:null,targets,subtasks,variants})])).rows;
}
async function occurrence(choreId:string,date="2026-10-14") { return (await db.query<{id:string;status:string}>("select id,status from public.chore_occurrences where chore_id=$1 and scheduled_date=$2",[choreId,date])).rows[0]!; }
async function steps(occurrenceId:string) { return (await db.query<Step>("select * from public.occurrence_subtasks where occurrence_id=$1 order by position",[occurrenceId])).rows; }
async function toggle(id:string,stepId:string,complete:boolean) { await db.query("select * from public.set_occurrence_subtask($1,$2,$3,$4)",[home,id,stepId,complete]); }
async function definitions(routineId:string) { return (await db.query<{id:string;title:string}>("select id,title from public.routine_subtasks where routine_id=$1 order by position",[routineId])).rows; }

describe("Category checklists, explicit variant targets, completion and history",()=>{
  beforeAll(async()=>{
    db=new PGlite();
    await db.exec(`create role anon noinherit; create role authenticated noinherit; create role service_role noinherit;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    const dir=path.resolve(import.meta.dirname,"../../../supabase/migrations");
    for(const file of (await readdir(dir)).filter((file)=>file.endsWith(".sql")&&file!==EXTENSION).sort()) await db.exec(await readFile(path.join(dir,file),"utf8"));
    await db.exec(`insert into auth.users values('${OWNER}','category-owner@example.com','{}'),('${MEMBER}','category-member@example.com','{}'),('${OUTSIDER}','category-other@example.com','{}')`);
    await auth();
    const h=(await db.query<{id:string;invite_code:string}>("select * from public.create_household('Category home')")).rows[0]!;home=h.id;
    await auth(MEMBER);await db.query("select * from public.join_household($1)",[h.invite_code]);
    await auth(OUTSIDER);otherHome=(await db.query<{id:string}>("select * from public.create_household('Other category home')")).rows[0]!.id;
    await auth();
    upstairs=(await db.query<{id:string}>("insert into public.rooms(household_id,name) values($1,'Upstairs Bathroom') returning id",[home])).rows[0]!.id;
    downstairs=(await db.query<{id:string}>("insert into public.rooms(household_id,name) values($1,'Downstairs Bathroom') returning id",[home])).rows[0]!.id;
    // This data exists before the incremental migration, like the applied remote.
    bathroom=await save("Clean Bathroom",[target(upstairs,"up"),target(downstairs,"down")],[{id:null,title:"Clean toilet"},{id:null,title:"Clean shower"}]);
    const old=await occurrence(bathroom[0]!.id,"2026-10-07");
    await db.query("select * from public.complete_occurrence($1,$2)",[old.id,home]);
    originalCompletion=(await db.query("select * from public.occurrence_completions where occurrence_id=$1",[old.id])).rows;
    await db.query("update public.rooms set name='Renamed upstairs room' where id=$1",[upstairs]);
    await db.exec("reset role");await db.exec(await readFile(path.join(dir,EXTENSION),"utf8"));await auth();
  });
  afterAll(async()=>db.close());
  it("backfills existing categories without replacing occurrences or completion attribution",async()=>{
    const old=await occurrence(bathroom[0]!.id,"2026-10-07");
    expect((await db.query("select * from public.occurrence_completions where occurrence_id=$1",[old.id])).rows).toEqual(originalCompletion);
    const list=await steps(old.id);expect(list.map((s)=>s.title)).toEqual(["Clean toilet","Clean shower"]);
    expect(list.every((s)=>s.completed_at&&s.completed_by===OWNER)).toBe(true);
    expect((await db.query<{room_name_snapshot:string}>("select room_name_snapshot from public.chore_occurrences where id=$1",[old.id])).rows[0]!.room_name_snapshot).toBe("Upstairs Bathroom");
  });
  it("stores sparse exclusions on the actual target and changes only future untouched checklists",async()=>{
    const defs=await definitions(bathroom[0]!.routine_id!);
    await save("Clean Bathroom",[target(upstairs,"up"),target(downstairs,"down")],[defs[0]!,{...defs[1]!,excludedTargets:["down"]}],bathroom[0]!.id);
    expect((await steps((await occurrence(bathroom[0]!.id)).id)).map((s)=>s.title)).toEqual(["Clean toilet","Clean shower"]);
    expect((await steps((await occurrence(bathroom[1]!.id)).id)).map((s)=>s.title)).toEqual(["Clean toilet"]);
    expect((await steps((await occurrence(bathroom[1]!.id,"2026-10-07")).id)).map((s)=>s.title)).toEqual(["Clean toilet","Clean shower"]);
  });
  it("persists partial progress independently from other rooms and occurrence dates",async()=>{
    const current=await occurrence(bathroom[0]!.id);const list=await steps(current.id);
    await auth(MEMBER);await toggle(current.id,list[0]!.id,true);
    expect((await occurrence(bathroom[0]!.id)).status).toBe("scheduled");
    expect((await steps(current.id)).filter((s)=>s.completed_at)).toHaveLength(1);
    expect((await steps(current.id))[0]!.completed_by).toBe(MEMBER);
    expect((await steps((await occurrence(bathroom[1]!.id)).id)).every((s)=>!s.completed_at)).toBe(true);
    expect((await steps((await occurrence(bathroom[0]!.id,"2026-10-21")).id)).every((s)=>!s.completed_at)).toBe(true);
  });
  it("auto-completes the parent with the final acting household member",async()=>{
    const current=await occurrence(bathroom[0]!.id);await auth();await toggle(current.id,(await steps(current.id))[1]!.id,true);
    expect((await occurrence(bathroom[0]!.id)).status).toBe("completed");
    expect((await db.query<{user_id:string}>("select user_id from public.occurrence_completions where occurrence_id=$1",[current.id])).rows).toEqual([{user_id:OWNER}]);
    expect((await occurrence(bathroom[1]!.id)).status).toBe("scheduled");
  });
  it("unchecks coherently and parent Undo clears all steps",async()=>{
    const current=await occurrence(bathroom[0]!.id);await toggle(current.id,(await steps(current.id))[0]!.id,false);
    expect((await occurrence(bathroom[0]!.id)).status).toBe("scheduled");
    expect((await steps(current.id)).filter((s)=>s.completed_at)).toHaveLength(1);
    expect((await db.query("select id from public.occurrence_completions where occurrence_id=$1",[current.id])).rows).toHaveLength(0);
    await db.query("select * from public.complete_occurrence($1,$2)",[current.id,home]);
    expect((await steps(current.id)).every((s)=>s.completed_at)).toBe(true);
    await db.query("select * from public.undo_occurrence_completion($1,$2)",[current.id,home]);
    expect((await steps(current.id)).every((s)=>!s.completed_at)).toBe(true);
  });
  it("keeps worked and completed snapshots intact when definitions change",async()=>{
    const current=await occurrence(bathroom[0]!.id);await toggle(current.id,(await steps(current.id))[0]!.id,true);
    const before=await steps(current.id);const historic=await steps((await occurrence(bathroom[0]!.id,"2026-10-07")).id);
    const defs=await definitions(bathroom[0]!.routine_id!);
    await save("Renamed Bathroom",[target(upstairs,"up"),target(downstairs,"down")],[{...defs[1]!,title:"Shower only"},{id:null,title:"Mop floor"}],bathroom[0]!.id);
    expect((await steps(current.id)).map(({title,position,completed_at})=>({title,position,completed_at}))).toEqual(before.map(({title,position,completed_at})=>({title,position,completed_at})));
    expect((await steps((await occurrence(bathroom[0]!.id,"2026-10-07")).id)).map((s)=>s.title)).toEqual(historic.map((s)=>s.title));
    expect((await steps((await occurrence(bathroom[0]!.id,"2026-10-21")).id)).map((s)=>s.title)).toEqual(["Shower only","Mop floor"]);
  });
  it("preserves partially worked occurrences during schedule regeneration and pause/resume",async()=>{
    const before=await occurrence(bathroom[0]!.id);const list=await steps(before.id);
    const defs=await definitions(bathroom[0]!.routine_id!);
    await save("Renamed Bathroom",[target(upstairs,"up",null,4),target(downstairs,"down")],defs,bathroom[0]!.id);
    expect((await db.query("select id from public.chore_occurrences where id=$1",[before.id])).rows).toHaveLength(1);
    expect(await steps(before.id)).toEqual(list);
    await db.query("select * from public.set_chore_active_with_occurrences($1,$2,false,'2026-10-12',array[]::date[])",[bathroom[0]!.id,home]);
    expect(await steps(before.id)).toEqual(list);
    await db.query("select * from public.set_chore_active_with_occurrences($1,$2,true,'2026-10-12',array['2026-10-15','2026-10-22']::date[])",[bathroom[0]!.id,home]);
  });
  it("keeps skip/reschedule independent and skipped snapshots read only",async()=>{
    const down=await occurrence(bathroom[1]!.id);await db.query("select * from public.skip_occurrence($1,$2)",[down.id,home]);
    expect((await steps(down.id)).length).toBeGreaterThan(0);
    await expect(toggle(down.id,(await steps(down.id))[0]!.id,true)).rejects.toThrow(/read only/i);
    const up=await occurrence(bathroom[0]!.id,"2026-10-15");const list=await steps(up.id);
    await db.query("select * from public.reschedule_occurrence($1,$2,'2026-10-16')",[up.id,home]);
    expect(await steps(up.id)).toEqual(list);
  });
  it("creates variants locally with separate schedules and completion",async()=>{
    const whitesKey="94333333-3333-4333-8333-333333333333";
    const laundry=await save("Laundry",[target(null,"darks",variant1),target(null,"towels",variant2,4),target(null,"whites",whitesKey)],
      [{id:null,title:"Wash"},{id:null,title:"Dry"}],null,[{id:null,key:variant1,name:"Darks"},{id:null,key:variant2,name:"Towels"},{id:null,key:whitesKey,name:"Whites"}]);
    expect(laundry).toHaveLength(3);expect(laundry[0]!.variant_id).not.toBe(laundry[1]!.variant_id);
    const darks=await occurrence(laundry[0]!.id);await db.query("select * from public.complete_occurrence($1,$2)",[darks.id,home]);
    expect((await occurrence(laundry[1]!.id,"2026-10-15")).status).toBe("scheduled");
    const linens=await save("Linens",[target(null,"local",variant1)],[],null,[{id:null,key:variant1,name:"Darks"}]);
    expect(linens[0]!.variant_id).not.toBe(laundry[0]!.variant_id);
  });
  it("creates only explicit Room + Variant targets and handles variant rename/removal without losing history",async()=>{
    const group=await save("Linens",[target(upstairs,"up-sheets",variant1),target(downstairs,"down-blankets",variant2)],
      [{id:null,title:"Change linens"}],null,[{id:null,key:variant1,name:"Sheets"},{id:null,key:variant2,name:"Blankets"}]);
    expect(group).toHaveLength(2);
    const old=await occurrence(group[0]!.id);await db.query("select * from public.complete_occurrence($1,$2)",[old.id,home]);
    const defs=await definitions(group[0]!.routine_id!);
    await save("Linens",[target(downstairs,"down-blankets",variant2)],defs,group[1]!.id,
      [{id:group[1]!.variant_id,key:variant2,name:"Warm blankets"}]);
    expect((await db.query<{variant_name_snapshot:string}>("select variant_name_snapshot from public.chore_occurrences where id=$1",[old.id])).rows[0]!.variant_name_snapshot).toBe("Sheets");
    expect((await steps(old.id))[0]!.completed_at).not.toBeNull();
    expect((await db.query("select id from public.chores where id=$1 and is_active",[group[0]!.id])).rows).toHaveLength(0);
  });
  it("leaves zero-step Categories and standalone Chores valid",async()=>{
    const category=await save("Zero steps",[target(null,"one")]);expect(category[0]!.routine_id).not.toBeNull();
    const chore=await save("Trash to curb",[target(null,"one")],[],null,[],"chore");expect(chore[0]!.routine_id).toBeNull();
    const one=await occurrence(chore[0]!.id);expect(await steps(one.id)).toHaveLength(0);
    await db.query("select * from public.complete_occurrence($1,$2)",[one.id,home]);expect((await occurrence(chore[0]!.id)).status).toBe("completed");
  });
  it("allows parent reminders during partial progress and suppresses after final automatic completion",async()=>{
    const chores=await save("Reminder category",[target(null,"one")],[{id:null,title:"First"},{id:null,title:"Last"}]);const id=chores[0]!.id;
    await db.query("select * from public.upsert_chore_reminder_v2($1,$2,true,'due_time','America/Chicago',$3::jsonb)",
      [home,id,JSON.stringify([{offset_value:0,offset_unit:"day",local_time:"09:00"}])]);
    const first=await occurrence(id);const list=await steps(first.id);await toggle(first.id,list[0]!.id,true);
    await db.exec("reset role");
    expect((await db.query<{chore_id:string}>("select chore_id from public.claim_due_reminder_deliveries('2026-10-14T14:00:00Z')")).rows.some((row)=>row.chore_id===id)).toBe(true);
    await auth();const next=await occurrence(id,"2026-10-21");for(const step of await steps(next.id)) await toggle(next.id,step.id,true);
    await db.exec("reset role");
    expect((await db.query<{chore_id:string}>("select chore_id from public.claim_due_reminder_deliveries('2026-10-21T14:00:00Z')")).rows.some((row)=>row.chore_id===id)).toBe(false);
    await auth();
  });
  it("enforces household and target isolation for variants, exclusions and checklist mutations",async()=>{
    await auth(OUTSIDER);
    for(const table of ["routine_variants","subtask_target_exclusions","occurrence_subtasks"]) expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    const current=await occurrence(bathroom[1]!.id);expect(current).toBeUndefined();
    await expect(db.query("select * from public.set_occurrence_subtask($1,$2,$3,true)",[home,OWNER,MEMBER])).rejects.toThrow(/authorized/i);
    await expect(db.query("update public.occurrence_subtasks set completed_at=now(),completed_by=$1",[OUTSIDER])).rejects.toThrow(/permission denied/i);
    await auth();const up=(await db.query<{id:string}>("select id from public.chore_occurrences where chore_id=$1 and status='scheduled' order by scheduled_date limit 1",[bathroom[0]!.id])).rows[0]!.id;
    const down=(await db.query<{id:string}>("select id from public.chore_occurrences where chore_id=$1 order by scheduled_date limit 1",[bathroom[1]!.id])).rows[0]!.id;
    await expect(toggle(up,(await steps(down))[0]!.id,true)).rejects.toThrow(/not found/i);
    await db.exec("reset role");
    await expect(db.query("insert into public.occurrence_subtasks(household_id,occurrence_id,title,position) values($1,$2,'Cross household',0)",[otherHome,up])).rejects.toThrow(/foreign key/i);
    await auth();
  });
  it("rejects cross-category variant and exclusion links even inside one household",async()=>{
    const group=await save("Local variants",[target(null,"local",variant1)],[{id:null,title:"Step"}],null,[{id:null,key:variant1,name:"Local"}]);
    await expect(save("Bad link",[target(upstairs,"up",variant1)],[],bathroom[0]!.id,[{id:group[0]!.variant_id,key:variant1,name:"Foreign variant"}])).rejects.toThrow(/not in this category/i);
    await db.exec("reset role");
    await expect(db.query("update public.chores set variant_id=$1 where id=$2",[group[0]!.variant_id,bathroom[0]!.id])).rejects.toThrow(/foreign key/i);
    const defs=await definitions(group[0]!.routine_id!);
    await expect(db.query("insert into public.subtask_target_exclusions(subtask_id,chore_id,routine_id,household_id) values($1,$2,$3,$4)",
      [defs[0]!.id,bathroom[0]!.id,group[0]!.routine_id,home])).rejects.toThrow(/foreign key/i);
    await auth();
    await expect(db.query("select * from public.complete_occurrence_without_checklist($1,$2)",[OWNER,home])).rejects.toThrow(/permission denied/i);
  });
  it("retirement preserves historical checklists and completions and makes target checklists read only",async()=>{
    const historic=await occurrence(bathroom[0]!.id,"2026-10-07");const list=await steps(historic.id);
    await db.query("select public.retire_chore($1,$2,true)",[home,bathroom[0]!.id]);
    expect(await steps(historic.id)).toEqual(list);
    expect((await db.query("select * from public.occurrence_completions where occurrence_id=$1",[historic.id])).rows).toEqual(originalCompletion);
    expect((await db.query("select id from public.chores where routine_id=$1 and retired_at is null",[bathroom[0]!.routine_id])).rows).toHaveLength(0);
    await expect(toggle(historic.id,list[0]!.id,false)).rejects.toThrow(/read only/i);
  });
  it("preserves a future occurrence's history after completion is undone and its definition/schedule changes",async()=>{
    const group=await save("Reopened category",[target(null,"one")],[{id:null,title:"Original first"},{id:null,title:"Original second"}]);
    const old=await occurrence(group[0]!.id);await db.query("select * from public.complete_occurrence($1,$2)",[old.id,home]);
    await db.query("select * from public.undo_occurrence_completion($1,$2)",[old.id,home]);
    const defs=await definitions(group[0]!.routine_id!);
    await save("Updated category",[target(null,"one",null,4)],[{...defs[1]!,title:"Updated second"}],group[0]!.id);
    expect((await db.query("select id from public.chore_occurrences where id=$1",[old.id])).rows).toHaveLength(1);
    expect((await steps(old.id)).map((step)=>step.title)).toEqual(["Original first","Original second"]);
    expect((await db.query("select id from public.activity_events where occurrence_id=$1",[old.id])).rows).toHaveLength(2);
    expect((await steps((await occurrence(group[0]!.id,"2026-10-15")).id)).map((step)=>step.title)).toEqual(["Updated second"]);
  });
});
