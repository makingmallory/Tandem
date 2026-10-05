import type { Chore } from "@/data/chores/types";

export function choreFixtures(): Chore[] {
  const shared = {
    household_id: "10000000-0000-4000-8000-000000000001",
    description: null,
    interval_count: 1,
    anchor_date: "2026-09-01",
    day_of_month: null,
    created_by: "40000000-0000-4000-8000-000000000001",
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-01T12:00:00Z",
  } satisfies Partial<Chore>;

  return [
    {
      ...shared,
      id: "20000000-0000-4000-8000-000000000001",
      name: "Water plants",
      icon_key: "plants",
      accent_key: "mint",
      recurrence_type: "weekly",
      weekdays: [0, 3],
      is_active: true,
    },
    {
      ...shared,
      id: "20000000-0000-4000-8000-000000000002",
      name: "Change sheets",
      icon_key: "bed",
      accent_key: "lavender",
      recurrence_type: "interval_weeks",
      interval_count: 2,
      weekdays: [6],
      is_active: false,
    },
  ];
}
