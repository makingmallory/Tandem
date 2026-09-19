import { createSupabaseServerClient } from "@/data/supabase/server";

export async function completeOccurrence(householdId: string, occurrenceId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("complete_occurrence", {
    p_household_id: householdId,
    p_occurrence_id: occurrenceId,
  }).single();
}

export async function undoOccurrenceCompletion(householdId: string, occurrenceId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("undo_occurrence_completion", {
    p_household_id: householdId,
    p_occurrence_id: occurrenceId,
  }).single();
}

export async function skipOccurrence(householdId: string, occurrenceId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("skip_occurrence", {
    p_household_id: householdId,
    p_occurrence_id: occurrenceId,
  }).single();
}

export async function rescheduleOccurrence(householdId: string, occurrenceId: string, scheduledDate: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("reschedule_occurrence", {
    p_household_id: householdId,
    p_occurrence_id: occurrenceId,
    p_scheduled_date: scheduledDate,
  }).single();
}
