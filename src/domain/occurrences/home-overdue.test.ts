import { describe, expect, it } from "vitest";
import { occurrenceFixture } from "@/data/occurrences/test-fixtures";
import { homeOverduePresentation } from "@/domain/occurrences/home-overdue";

describe("home overdue presentation", () => {
  it("keeps only the most recent overdue occurrence for each chore", () => {
    const olderLitter = occurrenceFixture("2026-10-01", 0);
    const latestLitter = occurrenceFixture("2026-10-04", 1, {
      chore_id: olderLitter.chore_id,
      chore: { ...olderLitter.chore, name: "Scoop litter" },
    });
    const dishes = occurrenceFixture("2026-10-03", 2, {
      chore: { ...occurrenceFixture("2026-10-03", 2).chore, name: "Wash dishes" },
    });

    const result = homeOverduePresentation([olderLitter, dishes, latestLitter], "2026-10-05");

    expect(result.total).toBe(2);
    expect(result.visible.map((occurrence) => occurrence.chore.name)).toEqual(["Scoop litter", "Wash dishes"]);
    expect(result.visible.map((occurrence) => occurrence.scheduled_date)).toEqual(["2026-10-04", "2026-10-03"]);
  });

  it("initially shows up to three days overdue and keeps older chores separate", () => {
    const recent = occurrenceFixture("2026-10-02", 0);
    const older = occurrenceFixture("2026-10-01", 1);

    const result = homeOverduePresentation([older, recent], "2026-10-05");

    expect(result.total).toBe(2);
    expect(result.visible).toEqual([recent]);
    expect(result.older).toEqual([older]);
  });

  it("does not replace a deferred latest occurrence with an older backlog row", () => {
    const older = occurrenceFixture("2026-10-01", 0);
    const deferredLatest = occurrenceFixture("2026-10-06", 1, {
      chore_id: older.chore_id,
      original_scheduled_date: "2026-10-04",
      is_rescheduled: true,
      chore: { ...older.chore },
    });

    const result = homeOverduePresentation([older, deferredLatest], "2026-10-05");

    expect(result).toEqual({ visible: [], older: [], total: 0 });
  });
});
