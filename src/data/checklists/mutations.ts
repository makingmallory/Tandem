import { createSupabaseServerClient } from "@/data/supabase/server";
export async function setOccurrenceSubtask(householdId: string, occurrenceId: string, subtaskId: string, complete: boolean) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("set_occurrence_subtask", { p_household_id: householdId, p_occurrence_id: occurrenceId,
    p_subtask_id: subtaskId, p_complete: complete }).single();
}
