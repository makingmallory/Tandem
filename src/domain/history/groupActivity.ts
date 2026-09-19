import type { ActivityEvent } from "@/data/history/types";
import { addDays, dateOnlyInTimeZone, startOfWeek } from "@/domain/dates/date-only";

export type ActivityGroupLabel = "Today" | "Yesterday" | "This Week" | "Older";

export function groupActivity(events: ActivityEvent[], now: Date, timeZone: string) {
  const today = dateOnlyInTimeZone(now, timeZone);
  const yesterday = addDays(today, -1);
  const weekStart = startOfWeek(today);
  const groups = new Map<ActivityGroupLabel, ActivityEvent[]>([
    ["Today", []], ["Yesterday", []], ["This Week", []], ["Older", []],
  ]);
  for (const event of events) {
    const date = dateOnlyInTimeZone(new Date(event.created_at), timeZone);
    const label: ActivityGroupLabel = date === today
      ? "Today"
      : date === yesterday
        ? "Yesterday"
        : date >= weekStart
          ? "This Week"
          : "Older";
    groups.get(label)!.push(event);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function activityChoreName(event: ActivityEvent) {
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? event.metadata
    : {};
  return event.chore?.name ?? (typeof metadata.chore_name === "string" ? metadata.chore_name : "Chore");
}

export function activityTitle(event: ActivityEvent) {
  const name = activityChoreName(event);
  if (event.event_type === "chore_uncompleted") return `${name} marked incomplete`;
  if (event.event_type === "chore_skipped") return `${name} skipped`;
  if (event.event_type === "chore_rescheduled") return `${name} rescheduled`;
  return name;
}
