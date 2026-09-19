import { dateOnlyParts, type DateOnly } from "@/domain/dates/date-only";

function displayDate(value: DateOnly) {
  const { year, month, day } = dateOnlyParts(value);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatLongDate(value: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(displayDate(value));
}

export function formatDayName(value: DateOnly, length: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-US", { weekday: length, timeZone: "UTC" }).format(displayDate(value));
}

export function formatMonthDay(value: DateOnly) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(displayDate(value));
}

export function formatDayNumber(value: DateOnly) {
  return String(dateOnlyParts(value).day);
}

export function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}
