import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import type { ChoreReminderRow } from "@/data/supabase/types";

export const getPersonalChoreReminders = cache(async (
  householdId: string,
  choreId: string,
  userId: string,
): Promise<ChoreReminderRow[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chore_reminders")
    .select("*")
    .eq("household_id", householdId)
    .eq("chore_id", choreId)
    .eq("user_id", userId)
    .eq("reminder_type", "due_time")
    .eq("selected", true)
    .order("offset_value", { ascending: true })
    .order("local_time", { ascending: true });
  if (error) throw new Error("We could not load your reminder.", { cause: error });
  return data ?? [];
});

export const getPersonalPushSubscriptions = cache(async (userId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, device_label, user_agent, created_at, last_seen_at")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error("We could not load notification devices.", { cause: error });
  return data ?? [];
});
