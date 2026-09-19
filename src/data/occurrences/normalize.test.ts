import { describe, expect, it } from "vitest";
import { normalizeOccurrence } from "@/data/occurrences/normalize";
import { occurrenceFixture } from "@/data/occurrences/test-fixtures";
import type { OccurrenceCompletion, RawOccurrenceWithChore } from "@/data/occurrences/types";

const embeddedCompletion: OccurrenceCompletion = {
  id: "30000000-0000-4000-8000-000000000001",
  occurrence_id: "00000000-0000-4000-8000-000000000001",
  household_id: "10000000-0000-4000-8000-000000000001",
  user_id: "40000000-0000-4000-8000-000000000001",
  completed_at: "2026-09-18T13:42:00Z",
  created_at: "2026-09-18T13:42:00Z",
  completer: { id: "40000000-0000-4000-8000-000000000001", display_name: "Nik", avatar_key: null },
};

function rawOccurrence(completion: OccurrenceCompletion[]): RawOccurrenceWithChore {
  return { ...occurrenceFixture("2026-09-18", 0), completion };
}

describe("occurrence query normalization", () => {
  it("maps an empty reverse relation array to null", () => {
    expect(normalizeOccurrence(rawOccurrence([])).completion).toBeNull();
  });

  it("maps the single embedded completion to the normalized object shape", () => {
    expect(normalizeOccurrence(rawOccurrence([embeddedCompletion])).completion).toEqual(embeddedCompletion);
  });
});
