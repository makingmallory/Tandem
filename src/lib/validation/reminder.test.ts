import { describe, expect, it } from "vitest";
import { reminderSchema } from "@/lib/validation/reminder";

describe("reminder validation", () => {
  it("accepts a due-time personal reminder", () => {
    expect(reminderSchema.parse({ enabled: true, localTime: "10:00", timezone: "America/Chicago", reminderType: "due_time" })).toEqual({
      enabled: true, localTime: "10:00", timezone: "America/Chicago", reminderType: "due_time",
    });
  });

  it("rejects invalid local times", () => {
    expect(reminderSchema.safeParse({ enabled: true, localTime: "25:00", timezone: "America/Chicago", reminderType: "due_time" }).success).toBe(false);
  });
});
