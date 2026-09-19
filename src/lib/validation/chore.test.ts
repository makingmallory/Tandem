import { describe, expect, it } from "vitest";
import { choreSchema } from "@/lib/validation/chore";

const validChore = {
  name: "Water the plants",
  description: "Kitchen and porch",
  iconKey: "plants",
  accentKey: "mint",
  recurrenceType: "weekly",
  intervalCount: 1,
  weekdays: [3, 0, 3],
  dayOfMonth: null,
  anchorDate: "2026-09-18",
};

describe("choreSchema", () => {
  it("normalizes a valid shared chore definition", () => {
    const parsed = choreSchema.parse(validChore);
    expect(parsed.name).toBe("Water the plants");
    expect(parsed.weekdays).toEqual([0, 3]);
    expect(parsed.dayOfMonth).toBeNull();
    expect(Object.keys(parsed)).not.toContain("assignedUserId");
    expect(Object.keys(parsed)).not.toContain("assignmentMode");
  });

  it("requires a name and known registry keys", () => {
    const parsed = choreSchema.safeParse({
      ...validChore,
      name: " ",
      iconKey: "made-up-icon",
      accentKey: "neon",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
      expect(fields.iconKey).toBeDefined();
      expect(fields.accentKey).toBeDefined();
    }
  });

  it("requires weekdays for weekly recurrence", () => {
    const parsed = choreSchema.safeParse({ ...validChore, weekdays: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.weekdays).toBeDefined();
  });

  it("requires a numbered day for monthly recurrence", () => {
    const parsed = choreSchema.safeParse({
      ...validChore,
      recurrenceType: "monthly",
      weekdays: [],
      dayOfMonth: null,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.dayOfMonth).toBeDefined();
  });

  it("clears frequency fields that do not apply", () => {
    const parsed = choreSchema.parse({
      ...validChore,
      recurrenceType: "daily",
      intervalCount: 9,
      weekdays: [1],
      dayOfMonth: 12,
    });
    expect(parsed).toMatchObject({ intervalCount: 1, weekdays: null, dayOfMonth: null });
  });
});
