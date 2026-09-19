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
