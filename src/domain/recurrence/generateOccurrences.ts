import type { RecurrenceType } from "@/domain/chores/recurrence";
import {
  addDays,
  compareDateOnly,
  dateOnlyParts,
  daysInMonth,
  differenceInDays,
  startOfWeek,
  weekday,
  type DateOnly,
} from "@/domain/dates/date-only";

export const OCCURRENCE_HORIZON_DAYS = 56;

export type OccurrenceRule = {
  recurrenceType: RecurrenceType;
  intervalCount: number;
  anchorDate: DateOnly;
  weekdays: readonly number[] | null;
  dayOfMonth: number | null;
};

function occursOn(rule: OccurrenceRule, date: DateOnly) {
  if (compareDateOnly(date, rule.anchorDate) < 0) return false;

  if (rule.recurrenceType === "daily") return true;
  if (rule.recurrenceType === "interval_days") {
    return differenceInDays(date, rule.anchorDate) % rule.intervalCount === 0;
  }

  if (rule.recurrenceType === "weekly" || rule.recurrenceType === "interval_weeks") {
    if (!rule.weekdays?.includes(weekday(date))) return false;
    const weeksSinceAnchor = differenceInDays(startOfWeek(date), startOfWeek(rule.anchorDate)) / 7;
    return weeksSinceAnchor % rule.intervalCount === 0;
  }

  const { year, month, day } = dateOnlyParts(date);
  const scheduledDay = Math.min(rule.dayOfMonth ?? 1, daysInMonth(year, month));
  return day === scheduledDay;
}

export function generateOccurrenceDates(
  rule: OccurrenceRule,
  rangeStart: DateOnly,
  rangeEnd: DateOnly,
): DateOnly[] {
  if (compareDateOnly(rangeEnd, rangeStart) < 0) return [];
  const dates: DateOnly[] = [];
  for (let date = rangeStart; compareDateOnly(date, rangeEnd) <= 0; date = addDays(date, 1)) {
    if (occursOn(rule, date)) dates.push(date);
  }
  return dates;
}

export function occurrenceHorizonEnd(start: DateOnly) {
  return addDays(start, OCCURRENCE_HORIZON_DAYS);
}

