import type { ChoreOccurrenceRow, ChoreRow, OccurrenceCompletionRow, ProfileRow, Database } from "@/data/supabase/types";

export type OccurrenceChore = Pick<
  ChoreRow,
  "id" | "name" | "icon_key" | "accent_key" | "recurrence_type" | "interval_count" | "weekdays" | "day_of_month"
> & { room?: { name: string } | null; variant?: { name: string } | null; routine?: { kind: "chore" | "category" } | null; retired_at?: string | null };

export type OccurrenceCompletion = OccurrenceCompletionRow & {
  completer: Pick<ProfileRow, "id" | "display_name" | "avatar_key"> | null;
};

export type OccurrenceWithChore = ChoreOccurrenceRow & {
  chore: OccurrenceChore;
  completion: OccurrenceCompletion | null;
  checklist?: Database["public"]["Tables"]["occurrence_subtasks"]["Row"][];
};

// PostgREST represents this reverse embed as an array because its relationship
// is backed by a composite foreign key, even though occurrence_id is unique.
export type RawOccurrenceWithChore = Omit<OccurrenceWithChore, "completion"> & {
  completion: OccurrenceCompletion[];
};
