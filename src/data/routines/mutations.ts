import { createSupabaseServerClient } from "@/data/supabase/server";
import type { Json } from "@/data/supabase/types";

export async function saveChorePlan(householdId: string, choreId: string | null, plan: Json, today: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("save_chore_plan", { p_household_id: householdId, p_chore_id: choreId, p_plan: plan, p_today: today });
}
export async function retireChore(householdId: string, choreId: string, entireRoutine: boolean) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("retire_chore", { p_household_id: householdId, p_chore_id: choreId, p_entire_routine: entireRoutine });
}
export async function updateCategoryTarget(householdId: string, choreId: string, input: {
  recurrenceType: string; intervalCount: number; anchorDate: string; weekdays: number[] | null; dayOfMonth: number | null;
  occurrenceDates: string[]; applicableSubtaskIds: string[]; today: string;
}) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("update_category_target", {
    p_household_id: householdId, p_chore_id: choreId, p_recurrence_type: input.recurrenceType,
    p_interval_count: input.intervalCount, p_anchor_date: input.anchorDate, p_weekdays: input.weekdays,
    p_day_of_month: input.dayOfMonth, p_occurrence_dates: input.occurrenceDates,
    p_applicable_subtask_ids: input.applicableSubtaskIds, p_today: input.today,
  }).single();
}
