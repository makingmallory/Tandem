import { describe, expect, it } from "vitest";
import { parseChorePlan, resolveTargets, targetKey } from "@/lib/validation/chore-plan";
import type { DateOnly } from "@/domain/dates/date-only";
const room1 = "81111111-1111-4111-8111-111111111111";
const room2 = "82222222-2222-4222-8222-222222222222";
const schedule = { recurrenceType: "weekly", intervalCount: 1, anchorDate: "2026-10-14", weekdays: [3], dayOfMonth: 1 };
function parse(roomIds: string[], customize = false, schedules = {}) {
  const form = new FormData();
  form.set("name", "Clean Bathroom"); form.set("description", ""); form.set("iconKey", "bathtub"); form.set("accentKey", "sky");
  form.set("schedulePlan", JSON.stringify({ roomIds, subtasks: [], schedule, customize, schedules }));
  return parseChorePlan(form, "2026-10-12" as DateOnly);
}
describe("chore plan generation", () => {
  it("creates independent variant-only targets and never infers a Room + Variant product",()=>{
    const variants=[{id:null,key:room1,name:"Darks"},{id:null,key:room2,name:"Towels"}];
    expect(resolveTargets([],variants,[]).map(targetKey)).toEqual([`variant:${room1}`,`variant:${room2}`]);
    expect(resolveTargets([room1,room2],variants,[])).toEqual([]);
    expect(resolveTargets([room1,room2],variants,[{roomId:room1,variantKey:room2}])).toEqual([{roomId:room1,variantKey:room2}]);
  });
  it("cannot replace edited common fields with stale fields from a schedule", () => {
    const form = new FormData();
    form.set("name", "New routine name"); form.set("description", "New notes"); form.set("iconKey", "plants"); form.set("accentKey", "mint");
    form.set("schedulePlan", JSON.stringify({ roomIds: [], subtasks: [], customize: false,
      schedule: { ...schedule, name: "Old name", description: "Old notes", iconKey: "bathtub", accentKey: "sky" }, schedules: {} }));
    const result = parseChorePlan(form, "2026-10-12" as DateOnly);
    if ("error" in result) throw new Error(result.error);
    expect(result.payload).toMatchObject({ name: "New routine name", description: "New notes", icon_key: "plants", accent_key: "mint" });
  });
  it("leaves normal roomless chores ungrouped with one schedule target", () => {
    const result = parse([]);
    expect(result).not.toHaveProperty("error");
    if (!("error" in result)) expect(result.payload).toMatchObject({ subtasks: [], targets: [{ room_id: null, weekdays: [3] }] });
  });
  it("generates matching dates independently for the shared schedule", () => {
    const result = parse([room1, room2]);
    if ("error" in result) throw new Error(result.error);
    const targets = (result.payload as { targets: Array<{ room_id: string; occurrence_dates: string[] }> }).targets;
    expect(targets.map((target) => target.room_id)).toEqual([room1, room2]);
    expect(targets[0]!.occurrence_dates).toEqual(targets[1]!.occurrence_dates);
    expect(targets[0]!.occurrence_dates[0]).toBe("2026-10-14");
  });
  it("uses per-room anchors and weekdays when customized", () => {
    const result = parse([room1, room2], true, { [room1]: schedule, [room2]: { ...schedule, anchorDate: "2026-10-15", weekdays: [4] } });
    if ("error" in result) throw new Error(result.error);
    const targets = (result.payload as { targets: Array<{ occurrence_dates: string[] }> }).targets;
    expect(targets[0]!.occurrence_dates[0]).toBe("2026-10-14");
    expect(targets[1]!.occurrence_dates[0]).toBe("2026-10-15");
  });
  it("rejects duplicate room targets and invalid custom schedules", () => {
    expect(parse([room1, room1])).toHaveProperty("error");
    expect(parse([room1], true, { [room1]: { ...schedule, weekdays: [] } })).toHaveProperty("error");
  });
});
