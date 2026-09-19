import type { ActivityEvent } from "@/data/history/types";

export function historyFixtures(): ActivityEvent[] {
  return [
    {
      id: "50000000-0000-4000-8000-000000000001",
      household_id: "10000000-0000-4000-8000-000000000001",
      actor_user_id: "40000000-0000-4000-8000-000000000001",
      event_type: "chore_completed",
      chore_id: "20000000-0000-4000-8000-000000000001",
      occurrence_id: "00000000-0000-4000-8000-000000000001",
      metadata: { chore_name: "Take trash out" },
      created_at: new Date().toISOString(),
      actor: { id: "40000000-0000-4000-8000-000000000001", display_name: "Nik", avatar_key: null },
      chore: { id: "20000000-0000-4000-8000-000000000001", name: "Take trash out", icon_key: "trash", accent_key: "amber" },
    },
  ];
}
