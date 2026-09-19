import type { ChoreOccurrenceRow, ChoreRow } from "@/data/supabase/types";

export type OccurrenceChore = Pick<
  ChoreRow,
  "id" | "name" | "icon_key" | "accent_key" | "recurrence_type" | "interval_count" | "weekdays" | "day_of_month"
>;

export type OccurrenceWithChore = ChoreOccurrenceRow & {
  chore: OccurrenceChore;
};

