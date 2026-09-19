import { describe, expect, it } from "vitest";
import { formatRecurrence } from "@/domain/formatters/recurrence";

describe("formatRecurrence", () => {
  it.each([
    [{ recurrenceType: "daily", intervalCount: 1, weekdays: null, dayOfMonth: null }, "Every day"],
    [{ recurrenceType: "interval_days", intervalCount: 3, weekdays: null, dayOfMonth: null }, "Every 3 days"],
    [{ recurrenceType: "weekly", intervalCount: 1, weekdays: [0], dayOfMonth: null }, "Every Sunday"],
    [{ recurrenceType: "weekly", intervalCount: 1, weekdays: [1, 4], dayOfMonth: null }, "Every Monday and Thursday"],
    [{ recurrenceType: "interval_weeks", intervalCount: 2, weekdays: [6], dayOfMonth: null }, "Every 2 weeks on Saturday"],
    [{ recurrenceType: "monthly", intervalCount: 1, weekdays: null, dayOfMonth: 1 }, "Monthly on the 1st"],
    [{ recurrenceType: "monthly", intervalCount: 1, weekdays: null, dayOfMonth: 22 }, "Monthly on the 22nd"],
  ] as const)("formats %j as %s", (definition, expected) => {
    expect(formatRecurrence(definition)).toBe(expected);
  });
});
