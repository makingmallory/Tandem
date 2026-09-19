export const RECURRENCE_TYPES = [
  "daily",
  "interval_days",
  "weekly",
  "interval_weeks",
  "monthly",
] as const;

export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

export const WEEKDAYS = [
  { value: 0, shortLabel: "S", label: "Sunday" },
  { value: 1, shortLabel: "M", label: "Monday" },
  { value: 2, shortLabel: "T", label: "Tuesday" },
  { value: 3, shortLabel: "W", label: "Wednesday" },
  { value: 4, shortLabel: "T", label: "Thursday" },
  { value: 5, shortLabel: "F", label: "Friday" },
  { value: 6, shortLabel: "S", label: "Saturday" },
] as const;

export type RecurrenceDefinition = {
  recurrenceType: RecurrenceType;
  intervalCount: number;
  weekdays: readonly number[] | null;
  dayOfMonth: number | null;
};
