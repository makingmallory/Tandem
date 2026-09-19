import type { OccurrenceWithChore, RawOccurrenceWithChore } from "@/data/occurrences/types";

export function normalizeOccurrence(row: RawOccurrenceWithChore): OccurrenceWithChore {
  const { completion: embeddedCompletions, ...occurrence } = row;
  return {
    ...occurrence,
    completion: embeddedCompletions[0] ?? null,
  };
}

export function normalizeOccurrences(rows: RawOccurrenceWithChore[]): OccurrenceWithChore[] {
  return rows.map(normalizeOccurrence);
}
