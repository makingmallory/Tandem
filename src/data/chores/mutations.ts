import type { ChoreInput } from "@/lib/validation/chore";
import { createSupabaseServerClient } from "@/data/supabase/server";

export async function createChoreWithOccurrences(
  householdId: string,
  input: ChoreInput,
  occurrenceDates: readonly string[],
) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("create_chore_with_occurrences", {
    p_household_id: householdId,
    p_name: input.name,
    p_description: input.description,
    p_icon_key: input.iconKey,
    p_accent_key: input.accentKey,
    p_recurrence_type: input.recurrenceType,
    p_interval_count: input.intervalCount,
    p_anchor_date: input.anchorDate,
    p_weekdays: input.weekdays,
    p_day_of_month: input.dayOfMonth,
    p_occurrence_dates: [...occurrenceDates],
  }).single();
}

export async function updateChore(
  householdId: string,
  choreId: string,
  input: ChoreInput,
  regenerationDate: string,
  occurrenceDates: readonly string[],
) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("update_chore_with_occurrences", {
    p_chore_id: choreId,
    p_household_id: householdId,
    p_name: input.name,
    p_description: input.description,
    p_icon_key: input.iconKey,
    p_accent_key: input.accentKey,
    p_recurrence_type: input.recurrenceType,
    p_interval_count: input.intervalCount,
    p_anchor_date: input.anchorDate,
    p_weekdays: input.weekdays,
    p_day_of_month: input.dayOfMonth,
    p_regeneration_date: regenerationDate,
    p_occurrence_dates: [...occurrenceDates],
  }).single();
}

export async function setChoreActive(
  householdId: string,
  choreId: string,
  isActive: boolean,
  regenerationDate: string,
  occurrenceDates: readonly string[],
) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("set_chore_active_with_occurrences", {
    p_chore_id: choreId,
    p_household_id: householdId,
    p_is_active: isActive,
    p_regeneration_date: regenerationDate,
    p_occurrence_dates: [...occurrenceDates],
  }).single();
}
