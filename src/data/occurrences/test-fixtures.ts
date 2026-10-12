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
    completion: null,
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
    today: [
      occurrenceFixture(today, 0),
      occurrenceFixture(today, 1, {
        status: "completed",
        completion: {
          id: "30000000-0000-4000-8000-000000000001",
          occurrence_id: "00000000-0000-4000-8000-000000000001",
          household_id: "10000000-0000-4000-8000-000000000001",
          user_id: "40000000-0000-4000-8000-000000000001",
          completed_at: "2026-09-18T13:42:00Z",
          created_at: "2026-09-18T13:42:00Z",
          completer: { id: "40000000-0000-4000-8000-000000000001", display_name: "Nik", avatar_key: null },
        },
      }),
      occurrenceFixture(today, 2, { status: "skipped" }),
    ],
    overdue: [occurrenceFixture(addDays(today, -1), 2)],
    upcoming: [occurrenceFixture(addDays(today, 2), 1), occurrenceFixture(addDays(today, 4), 2)],
  };
}

export function categoryOccurrenceFixture(date: DateOnly): OccurrenceWithChore {
  const occurrence = occurrenceFixture(date, 9);
  return { ...occurrence, title_snapshot: "Clean Bathroom", room_name_snapshot: "Upstairs Bathroom", variant_name_snapshot: null,
    checklist_materialized: true, chore: { ...occurrence.chore, name: "Clean Bathroom", room: { name: "Upstairs Bathroom" } },
    checklist: ["Clean toilet", "Clean mirror", "Clean shower"].map((title, index) => ({
      id: `90000000-0000-4000-8000-00000000000${index}`, occurrence_id: occurrence.id, household_id: occurrence.household_id,
      source_subtask_id: null, title, position: index, completed_at: index === 0 ? "2026-10-12T12:00:00Z" : null,
      completed_by: index === 0 ? "40000000-0000-4000-8000-000000000001" : null,
    })),
  };
}
