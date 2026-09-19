import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import type { OccurrenceWithChore } from "@/data/occurrences/types";

const occurrenceSelection = `
  id, household_id, chore_id, scheduled_date, original_scheduled_date,
  status, is_rescheduled, created_at, updated_at,
  chore:chores!inner(
    id, name, icon_key, accent_key, recurrence_type,
    interval_count, weekdays, day_of_month, is_active
  )
`;

function occurrenceError(error: unknown) {
  throw new Error("We could not load your scheduled chores.", { cause: error });
}

export const getOccurrencesForRange = cache(
  async (householdId: string, start: string, end: string): Promise<OccurrenceWithChore[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chore_occurrences")
      .select(occurrenceSelection)
      .eq("household_id", householdId)
      .eq("chore.is_active", true)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date", { ascending: true });
    if (error) occurrenceError(error);
    return (data ?? []) as unknown as OccurrenceWithChore[];
  },
);

export const getTodayOccurrences = cache(
  async (householdId: string, date: string): Promise<OccurrenceWithChore[]> =>
    getOccurrencesForRange(householdId, date, date),
);

export const getOverdueOccurrences = cache(
  async (householdId: string, date: string): Promise<OccurrenceWithChore[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chore_occurrences")
      .select(occurrenceSelection)
      .eq("household_id", householdId)
      .eq("chore.is_active", true)
      .eq("status", "scheduled")
      .lt("scheduled_date", date)
      .order("scheduled_date", { ascending: true });
    if (error) occurrenceError(error);
    return (data ?? []) as unknown as OccurrenceWithChore[];
  },
);

export const getUpcomingOccurrences = cache(
  async (householdId: string, after: string, end: string, limit = 3): Promise<OccurrenceWithChore[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chore_occurrences")
      .select(occurrenceSelection)
      .eq("household_id", householdId)
      .eq("chore.is_active", true)
      .eq("status", "scheduled")
      .gt("scheduled_date", after)
      .lte("scheduled_date", end)
      .order("scheduled_date", { ascending: true })
      .limit(limit);
    if (error) occurrenceError(error);
    return (data ?? []) as unknown as OccurrenceWithChore[];
  },
);

