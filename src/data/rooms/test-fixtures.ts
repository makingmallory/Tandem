import type { RoomRow } from "@/data/supabase/types";
// Only used by the data-free local browser test shell, never household defaults.
export function roomFixtures(): RoomRow[] {
  return ["Master Bathroom", "Downstairs Bathroom", "Kitchen"].map((name, index) => ({
    id: `81000000-0000-4000-8000-00000000000${index}`, household_id: "10000000-0000-4000-8000-000000000001",
    name, archived_at: null, created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z",
  }));
}
