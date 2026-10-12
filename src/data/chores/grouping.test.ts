import { describe, expect, it } from "vitest";
import { groupChores, isActiveEntry } from "@/data/chores/grouping";
import type { Chore } from "@/data/chores/types";

function chore(id: string, name: string, overrides: Partial<Chore> = {}): Chore {
  return { id, household_id: "home-1", name, description: null, icon_key: "checklist", accent_key: "teal",
    recurrence_type: "weekly", interval_count: 1, anchor_date: "2026-10-14", weekdays: [3], day_of_month: null,
    room_id: null, routine_id: null, variant_id: null, retired_at: null, is_active: true, created_by: "user-1",
    created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z", ...overrides };
}

describe("Active Chores routine grouping", () => {
  it("groups two independently scheduled Room targets beneath one root entry", () => {
    const entries = groupChores([
      chore("upstairs", "Clean Bathroom", { routine_id: "bathroom", room_id: "upstairs", recurrence_type: "weekly" }),
      chore("downstairs", "Clean Bathroom", { routine_id: "bathroom", room_id: "downstairs", recurrence_type: "daily" }),
    ], new Map([["bathroom", "category"]]));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "group", targets: [{ id: "upstairs", recurrence_type: "weekly" }, { id: "downstairs", recurrence_type: "daily" }] });
  });

  it("leaves standalone chores and roomless Categories as one normal root item", () => {
    const entries = groupChores([
      chore("standalone", "Water plants"),
      chore("roomless-category", "Kitchen reset", { routine_id: "kitchen" }),
    ], new Map([["kitchen", "category"]]));
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.kind === "chore")).toBe(true);
  });

  it("groups Variant targets without creating a Room by Variant product and retains paused targets", () => {
    const entries = groupChores([
      chore("lights", "Laundry", { routine_id: "laundry", variant_id: "lights" }),
      chore("darks", "Laundry", { routine_id: "laundry", variant_id: "darks", is_active: false }),
    ], new Map([["laundry", "chore"]]));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "group", targets: [{ room_id: null, variant_id: "lights" }, { room_id: null, variant_id: "darks", is_active: false }] });
    expect(isActiveEntry(entries[0]!)).toBe(true);
  });
});
