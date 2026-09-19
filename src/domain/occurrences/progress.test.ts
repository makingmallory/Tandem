import { describe, expect, it } from "vitest";
import { occurrenceFixture } from "@/data/occurrences/test-fixtures";
import { occurrenceProgress, sortOccurrencesForToday } from "@/domain/occurrences/progress";

describe("occurrence progress", () => {
  it("counts completions and excludes skipped chores from the total", () => {
    const items = [
      occurrenceFixture("2026-09-18", 0, { status: "scheduled" }),
      occurrenceFixture("2026-09-18", 1, { status: "completed" }),
      occurrenceFixture("2026-09-18", 2, { status: "skipped" }),
    ];
    expect(occurrenceProgress(items)).toEqual({ completed: 1, total: 2 });
    expect(sortOccurrencesForToday(items).map((item) => item.status)).toEqual([
      "scheduled", "completed", "skipped",
    ]);
  });
});
