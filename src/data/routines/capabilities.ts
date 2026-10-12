import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";

export const getCategoryFeaturesAvailable = cache(async (householdId: string) => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("routine_variants").select("id").eq("household_id", householdId).limit(1);
  if (error?.code === "PGRST205" || error?.code === "42P01") return false;
  if (error) throw new Error("We could not load category features.", { cause: error });
  return true;
});
