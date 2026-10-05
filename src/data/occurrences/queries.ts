import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import { normalizeOccurrence, normalizeOccurrences } from "@/data/occurrences/normalize";
import type { OccurrenceWithChore, RawOccurrenceWithChore } from "@/data/occurrences/types";

const occurrenceSelection = `
  id, household_id, chore_id, scheduled_date, original_scheduled_date,
  status, is_rescheduled, created_at, updated_at,
  chore:chores!inner(
    id, name, icon_key, accent_key, recurrence_type,
    interval_count, weekdays, day_of_month, is_active
  ),
  completion:occurrence_completions(
    id, occurrence_id, household_id, user_id, completed_at, created_at,
    completer:profiles!occurrence_completions_user_id_fkey(id, display_name, avatar_key)
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
    return normalizeOccurrences((data ?? []) as unknown as RawOccurrenceWithChore[]);
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
      // Include a recently deferred occurrence so Home can use its original
      // due date to suppress older backlog rows for the same chore.
      .lt("original_scheduled_date", date)
      .order("original_scheduled_date", { ascending: true });
    if (error) occurrenceError(error);
    return normalizeOccurrences((data ?? []) as unknown as RawOccurrenceWithChore[]);
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
      .gt("scheduled_date", after)
      .lte("scheduled_date", end)
      .order("scheduled_date", { ascending: true })
      .limit(limit);
    if (error) occurrenceError(error);
    return normalizeOccurrences((data ?? []) as unknown as RawOccurrenceWithChore[]);
  },
);

export const getChoreOccurrenceSummary = cache(
  async (householdId: string, choreId: string): Promise<{
    actionable: OccurrenceWithChore | null;
    latestCompleted: OccurrenceWithChore | null;
  }> => {
    const supabase = await createSupabaseServerClient();
    const [actionableResult, completedResult] = await Promise.all([
      supabase
        .from("chore_occurrences")
        .select(occurrenceSelection)
        .eq("household_id", householdId)
        .eq("chore_id", choreId)
        .eq("status", "scheduled")
        .order("scheduled_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chore_occurrences")
        .select(occurrenceSelection)
        .eq("household_id", householdId)
        .eq("chore_id", choreId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (actionableResult.error) occurrenceError(actionableResult.error);
    if (completedResult.error) occurrenceError(completedResult.error);
    return {
      actionable: actionableResult.data
        ? normalizeOccurrence(actionableResult.data as unknown as RawOccurrenceWithChore)
        : null,
      latestCompleted: completedResult.data
        ? normalizeOccurrence(completedResult.data as unknown as RawOccurrenceWithChore)
        : null,
    };
  },
);
