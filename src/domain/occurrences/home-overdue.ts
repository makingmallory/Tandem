import type { OccurrenceWithChore } from "@/data/occurrences/types";
import { differenceInDays, type DateOnly } from "@/domain/dates/date-only";

const INITIAL_OVERDUE_DAYS = 3;

export type HomeOverduePresentation = {
  visible: OccurrenceWithChore[];
  older: OccurrenceWithChore[];
  total: number;
};

export function homeOverduePresentation(
  occurrences: OccurrenceWithChore[],
  today: DateOnly,
): HomeOverduePresentation {
  const latestByChore = new Map<string, OccurrenceWithChore>();

  for (const occurrence of occurrences) {
    const current = latestByChore.get(occurrence.chore_id);
    if (!current || occurrence.original_scheduled_date > current.original_scheduled_date) {
      latestByChore.set(occurrence.chore_id, occurrence);
    }
  }

  const actionable = [...latestByChore.values()].filter((occurrence) => occurrence.scheduled_date < today);
  const deduped = actionable.sort((left, right) =>
    right.scheduled_date.localeCompare(left.scheduled_date),
  );
  const visible = deduped.filter(
    (occurrence) => differenceInDays(today, occurrence.scheduled_date as DateOnly) <= INITIAL_OVERDUE_DAYS,
  );
  const older = deduped.filter(
    (occurrence) => differenceInDays(today, occurrence.scheduled_date as DateOnly) > INITIAL_OVERDUE_DAYS,
  );

  return { visible, older, total: deduped.length };
}
