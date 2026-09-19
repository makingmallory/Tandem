import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import type { ActivityEvent } from "@/data/history/types";

export const getHouseholdActivity = cache(async (householdId: string, limit = 100): Promise<ActivityEvent[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select(`
      id, household_id, actor_user_id, event_type, chore_id, occurrence_id, metadata, created_at,
      actor:profiles!activity_events_actor_user_id_fkey(id, display_name, avatar_key),
      chore:chores(id, name, icon_key, accent_key)
    `)
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("We could not load household history.", { cause: error });
  return (data ?? []) as unknown as ActivityEvent[];
});
