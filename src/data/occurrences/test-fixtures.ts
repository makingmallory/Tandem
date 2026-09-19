import type { OccurrenceWithChore } from "@/data/occurrences/types";
import { addDays, type DateOnly } from "@/domain/dates/date-only";

export function occurrenceFixture(
  date: DateOnly,
  index: number,
  overrides: Partial<OccurrenceWithChore> = {},
): OccurrenceWithChore {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    household_id: "10000000-0000-4000-8000-000000000001",
    chore_id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    scheduled_date: date,
    original_scheduled_date: date,
    status: "scheduled",
    is_rescheduled: false,
    created_at: "2026-09-18T12:00:00Z",
    updated_at: "2026-09-18T12:00:00Z",
    chore: {
      id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      name: ["Wipe kitchen counters", "Water plants", "Take trash out"][index % 3]!,
      icon_key: ["sparkle", "plants", "trash"][index % 3] as "sparkle" | "plants" | "trash",
      accent_key: ["rose", "mint", "amber"][index % 3] as "rose" | "mint" | "amber",
      recurrence_type: "weekly",
      interval_count: 1,
      weekdays: [1],
      day_of_month: null,
    },
    ...overrides,
  };
}

export function homeOccurrenceFixtures(today: DateOnly) {
  return {
    today: [occurrenceFixture(today, 0), occurrenceFixture(today, 1)],
    overdue: [occurrenceFixture(addDays(today, -1), 2)],
    upcoming: [occurrenceFixture(addDays(today, 2), 1), occurrenceFixture(addDays(today, 4), 2)],
  };
}

