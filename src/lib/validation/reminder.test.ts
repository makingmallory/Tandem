import { describe, expect, it } from "vitest";
import { reminderDefinitionLabel, reminderSchema } from "@/lib/validation/reminder";

const base = {
  enabled: true,
  timezone: "America/Chicago",
  reminderType: "due_time" as const,
};

describe("reminder validation", () => {
  it("accepts multiple arbitrary day, week, month, and due-date definitions", () => {
    const reminders = [
      { offsetValue: 0, offsetUnit: "day", localTime: "08:00" },
      { offsetValue: 2, offsetUnit: "day", localTime: "09:00" },
      { offsetValue: 3, offsetUnit: "week", localTime: "07:30" },
      { offsetValue: 2, offsetUnit: "month", localTime: "18:00" },
    ];
    expect(reminderSchema.parse({ ...base, reminders }).reminders).toEqual(reminders);
  });

  it("rejects duplicate definitions and invalid due-date units", () => {
    const duplicate = { offsetValue: 2, offsetUnit: "day", localTime: "09:00" };
    expect(reminderSchema.safeParse({ ...base, reminders: [duplicate, duplicate] }).success).toBe(false);
    expect(reminderSchema.safeParse({
      ...base,
      reminders: [{ offsetValue: 0, offsetUnit: "week", localTime: "09:00" }],
    }).success).toBe(false);
  });

  it("allows an empty builder only while notifications are off", () => {
    expect(reminderSchema.safeParse({ ...base, reminders: [] }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, enabled: false, reminders: [] }).success).toBe(true);
  });

  it("enforces sensible unit-specific limits", () => {
    expect(reminderSchema.safeParse({
      ...base,
      reminders: [{ offsetValue: 53, offsetUnit: "week", localTime: "09:00" }],
    }).success).toBe(false);
    expect(reminderSchema.safeParse({
      ...base,
      reminders: [{ offsetValue: 25, offsetUnit: "month", localTime: "09:00" }],
    }).success).toBe(false);
  });

  it("accepts only 5-minute notification boundaries", () => {
    expect(reminderSchema.safeParse({
      ...base,
      reminders: [{ offsetValue: 0, offsetUnit: "day", localTime: "09:05" }],
    }).success).toBe(true);
    expect(reminderSchema.safeParse({
      ...base,
      reminders: [{ offsetValue: 0, offsetUnit: "day", localTime: "09:03" }],
    }).success).toBe(false);
    expect(reminderSchema.safeParse({
      ...base,
      reminders: [{ offsetValue: 0, offsetUnit: "day", localTime: "09:05:00" }],
    }).success).toBe(false);
  });

  it("formats editable definitions in human language", () => {
    expect(reminderDefinitionLabel({ offsetValue: 0, offsetUnit: "day", localTime: "08:00" }))
      .toBe("On the due date at 08:00");
    expect(reminderDefinitionLabel({ offsetValue: 2, offsetUnit: "week", localTime: "09:00" }))
      .toBe("2 weeks before at 09:00");
  });
});
