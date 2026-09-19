import { describe, expect, it } from "vitest";
import { addDays, dateOnlyFromDate, dateOnlyInTimeZone, type DateOnly } from "@/domain/dates/date-only";
import {
  generateOccurrenceDates,
  occurrenceHorizonEnd,
  type OccurrenceRule,
} from "@/domain/recurrence/generateOccurrences";

function rule(overrides: Partial<OccurrenceRule> = {}): OccurrenceRule {
  return {
    recurrenceType: "daily",
    intervalCount: 1,
    anchorDate: "2026-09-01",
    weekdays: null,
    dayOfMonth: null,
    ...overrides,
  };
}

describe("generateOccurrenceDates", () => {
  it("generates every day inside an inclusive range", () => {
    expect(generateOccurrenceDates(rule(), "2026-09-18", "2026-09-20")).toEqual([
      "2026-09-18", "2026-09-19", "2026-09-20",
    ]);
  });

  it("treats the explicit start date as occurrence one for every-N-days", () => {
    expect(generateOccurrenceDates(
      rule({ recurrenceType: "interval_days", intervalCount: 3, anchorDate: "2026-09-18" }),
      "2026-09-18",
      "2026-09-27",
    )).toEqual(["2026-09-18", "2026-09-21", "2026-09-24", "2026-09-27"]);
  });

  it("supports multiple selected weekdays", () => {
    expect(generateOccurrenceDates(rule({ recurrenceType: "weekly", weekdays: [1, 4] }), "2026-09-13", "2026-09-20"))
      .toEqual(["2026-09-14", "2026-09-17"]);
  });

  it("anchors every two weeks on Monday to the explicit Monday start", () => {
    expect(generateOccurrenceDates(
      rule({ recurrenceType: "interval_weeks", intervalCount: 2, anchorDate: "2026-09-21", weekdays: [1] }),
      "2026-09-18",
      "2026-10-20",
    )).toEqual(["2026-09-21", "2026-10-05", "2026-10-19"]);
  });

  it("generates all selected weekdays in each anchored every-N-weeks cycle", () => {
    expect(generateOccurrenceDates(
      rule({ recurrenceType: "interval_weeks", intervalCount: 2, anchorDate: "2026-09-21", weekdays: [1, 4] }),
      "2026-09-18",
      "2026-10-20",
    )).toEqual(["2026-09-21", "2026-09-24", "2026-10-05", "2026-10-08", "2026-10-19"]);
  });

  it("never emits a selected weekday before the schedule start date", () => {
    expect(generateOccurrenceDates(
      rule({ recurrenceType: "interval_weeks", intervalCount: 2, anchorDate: "2026-09-21", weekdays: [1, 4] }),
      "2026-09-13",
      "2026-09-24",
    )).toEqual(["2026-09-21", "2026-09-24"]);
  });

  it("generates monthly numbered dates", () => {
    expect(generateOccurrenceDates(rule({ recurrenceType: "monthly", dayOfMonth: 12 }), "2026-09-01", "2026-11-30"))
      .toEqual(["2026-09-12", "2026-10-12", "2026-11-12"]);
  });

  it("falls back to the final valid day for short months", () => {
    expect(generateOccurrenceDates(rule({ recurrenceType: "monthly", anchorDate: "2027-01-01", dayOfMonth: 31 }), "2027-01-01", "2027-04-30"))
      .toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("keeps a full eight-week future horizon", () => {
    const start: DateOnly = "2026-09-18";
    const end = occurrenceHorizonEnd(start);
    const dates = generateOccurrenceDates(rule(), start, end);
    expect(end).toBe("2026-11-13");
    expect(dates).toHaveLength(57);
    expect(dates.at(-1)).toBe(end);
  });

  it("keeps date-only arithmetic stable across host timezone boundaries", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(dateOnlyFromDate(new Date(2026, 8, 18, 23, 59))).toBe("2026-09-18");
    const boundary = new Date("2026-09-19T04:30:00.000Z");
    expect(dateOnlyInTimeZone(boundary, "America/Chicago")).toBe("2026-09-18");
    expect(dateOnlyInTimeZone(boundary, "UTC")).toBe("2026-09-19");
  });
});
