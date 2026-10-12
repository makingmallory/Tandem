import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "@/data/history/types";
import { activityTitle, groupActivity } from "@/domain/history/groupActivity";

function event(createdAt: string, type: ActivityEvent["event_type"] = "chore_completed"): ActivityEvent {
  return {
    id: createdAt, household_id: "home", actor_user_id: "user", event_type: type,
    chore_id: null, occurrence_id: null, metadata: { chore_name: "Dishes" }, created_at: createdAt,
    actor: { id: "user", display_name: "Nik", avatar_key: null }, chore: null,
  };
}

describe("activity history", () => {
  it("retains event-time chore and room names after later edits or retirement", () => {
    const row = event("2026-10-12T12:00:00Z");
    row.metadata = { chore_name: "Clean Bathroom", room_name: "Master Bathroom" };
    row.chore = { id: "chore", name: "Renamed routine", icon_key: "bathtub", accent_key: "sky" };
    expect(activityTitle(row)).toBe("Clean Bathroom · Master Bathroom");
  });
  it("groups timestamps using the household timezone", () => {
    const groups = groupActivity([
      event("2026-09-18T05:30:00Z"),
      event("2026-09-17T20:00:00Z"),
      event("2026-09-15T20:00:00Z"),
      event("2026-09-01T20:00:00Z"),
    ], new Date("2026-09-18T16:00:00Z"), "America/Chicago");
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ["Today", 1], ["Yesterday", 1], ["This Week", 1], ["Older", 1],
    ]);
  });

  it("formats the supported event actions", () => {
    expect(activityTitle(event("2026-09-18T12:00:00Z"))).toBe("Dishes");
    expect(activityTitle(event("2026-09-18T12:00:00Z", "chore_uncompleted"))).toBe("Dishes marked incomplete");
    expect(activityTitle(event("2026-09-18T12:00:00Z", "chore_rescheduled"))).toBe("Dishes rescheduled");
  });
});
