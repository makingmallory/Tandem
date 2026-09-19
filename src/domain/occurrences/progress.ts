import type { OccurrenceWithChore } from "@/data/occurrences/types";

export function occurrenceProgress(occurrences: OccurrenceWithChore[]) {
  const countable = occurrences.filter((occurrence) => occurrence.status !== "skipped");
  return {
    completed: countable.filter((occurrence) => occurrence.status === "completed").length,
    total: countable.length,
  };
}

export function sortOccurrencesForToday(occurrences: OccurrenceWithChore[]) {
  const rank = { scheduled: 0, completed: 1, skipped: 2 } as const;
  return [...occurrences].sort((left, right) => rank[left.status] - rank[right.status]);
}
