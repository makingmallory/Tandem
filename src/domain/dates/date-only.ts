export type DateOnly = `${number}-${number}-${number}`;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MILLISECONDS = 86_400_000;

function parts(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid date-only value: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return { year, month, day, date };
}

export function isDateOnly(value: string): value is DateOnly {
  try {
    parts(value);
    return true;
  } catch {
    return false;
  }
}

export function toDateOnly(year: number, month: number, day: number): DateOnly {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as DateOnly;
}

export function dateOnlyFromDate(value: Date): DateOnly {
  return toDateOnly(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

export function dateOnlyInTimeZone(value: Date, timeZone: string): DateOnly {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(value);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    Number(dateParts.find((part) => part.type === type)?.value);
  return toDateOnly(valueFor("year"), valueFor("month"), valueFor("day"));
}

export function todayDateOnly(now = new Date(), timeZone?: string): DateOnly {
  return timeZone ? dateOnlyInTimeZone(now, timeZone) : dateOnlyFromDate(now);
}

export function addDays(value: DateOnly, amount: number): DateOnly {
  const date = parts(value).date;
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function differenceInDays(later: DateOnly, earlier: DateOnly) {
  return Math.round((parts(later).date.getTime() - parts(earlier).date.getTime()) / DAY_MILLISECONDS);
}

export function weekday(value: DateOnly) {
  return parts(value).date.getUTCDay();
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dateOnlyParts(value: DateOnly) {
  const { year, month, day } = parts(value);
  return { year, month, day };
}

export function startOfWeek(value: DateOnly): DateOnly {
  return addDays(value, -weekday(value));
}

export function compareDateOnly(left: DateOnly, right: DateOnly) {
  return left.localeCompare(right);
}

export function maxDateOnly(left: DateOnly, right: DateOnly) {
  return compareDateOnly(left, right) >= 0 ? left : right;
}
