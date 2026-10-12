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
