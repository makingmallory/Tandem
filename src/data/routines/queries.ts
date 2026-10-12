import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import { getRoomContext } from "@/data/rooms/queries";
import { getCategoryFeaturesAvailable } from "@/data/routines/capabilities";
import type { Database } from "@/data/supabase/types";

export const getHouseholdVariants = cache(async (householdId: string) => {
  if (!(await getCategoryFeaturesAvailable(householdId))) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("routine_variants").select("id,name").eq("household_id", householdId);
  if (error) throw new Error("We could not load variants.", { cause: error });
  return data;
});

export const getHouseholdRoutineKinds = cache(async (householdId: string) => {
  if (!(await getRoomContext(householdId)).available) return new Map<string, "chore" | "category">();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("routines").select("id,kind").eq("household_id", householdId).is("archived_at", null);
  if (error) throw new Error("We could not load your routine groups.", { cause: error });
  return new Map(data.map((routine) => [routine.id, routine.kind ?? "category"]));
});

export const getRoutineDetails = cache(async (householdId: string, routineId: string) => {
  if (!(await getRoomContext(householdId)).available) return null;
  const supabase = await createSupabaseServerClient();
  const [routine, targets, subtasks] = await Promise.all([
    supabase.from("routines").select("*").eq("household_id", householdId).eq("id", routineId).single(),
    supabase.from("chores").select("*").eq("household_id", householdId).eq("routine_id", routineId).is("retired_at", null).order("created_at"),
    supabase.from("routine_subtasks").select("*").eq("household_id", householdId).eq("routine_id", routineId).order("position"),
  ]);
  const error = routine.error ?? targets.error ?? subtasks.error;
  if (error) throw new Error("We could not load your routine.", { cause: error });
  const featuresAvailable = await getCategoryFeaturesAvailable(householdId);
  let variants: Database["public"]["Tables"]["routine_variants"]["Row"][] = [];
  let exclusions: Database["public"]["Tables"]["subtask_target_exclusions"]["Row"][] = [];
  if (featuresAvailable) {
    const [variantResult, exclusionResult] = await Promise.all([
      supabase.from("routine_variants").select("*").eq("household_id", householdId).eq("routine_id", routineId).is("archived_at", null).order("created_at"),
      supabase.from("subtask_target_exclusions").select("*").eq("household_id", householdId).eq("routine_id", routineId),
    ]);
    if (variantResult.error || exclusionResult.error) throw new Error("We could not load category targets.", { cause: variantResult.error ?? exclusionResult.error });
    variants = variantResult.data!; exclusions = exclusionResult.data!;
  }
  return { routine: routine.data!, targets: targets.data!, subtasks: subtasks.data!, variants, exclusions, featuresAvailable };
});
