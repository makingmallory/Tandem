import { describe, expect, it } from "vitest";
import { getSuggestionPreset, SUGGESTION_PRESETS } from "@/data/suggestions/catalog";

describe("starter suggestion catalog", () => {
  it("contains the requested Category checklist and no persistence metadata", () => {
    const bathroom = getSuggestionPreset("bathroom-cleaning")!;
    expect(bathroom).toMatchObject({ kind: "category", roomHint: "Bathroom", schedule: { recurrenceType: "weekly" } });
    expect(bathroom.subtasks).toEqual(expect.arrayContaining(["Clean toilet", "Clean shower or tub"]));
    expect(bathroom).not.toHaveProperty("templateId");
  });

  it("includes Laundry variants and standalone room-oriented chores", () => {
    expect(getSuggestionPreset("laundry")?.variants).toEqual(["Darks", "Whites", "Towels", "Bedding"]);
    expect(getSuggestionPreset("vacuum-floors")).toMatchObject({ kind: "chore", roomHint: expect.any(String) });
    expect(SUGGESTION_PRESETS).toHaveLength(11);
  });
});
