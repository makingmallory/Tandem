import { createSupabaseServerClient } from "@/data/supabase/server";
import type { ReminderInput } from "@/lib/validation/reminder";

export async function savePersonalReminder(householdId: string, choreId: string, input: ReminderInput) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("upsert_chore_reminder_v2", {
    p_household_id: householdId,
    p_chore_id: choreId,
    p_enabled: input.enabled,
    p_reminder_type: input.reminderType,
    p_timezone: input.timezone,
    p_reminders: input.reminders.map((reminder) => ({
      offset_value: reminder.offsetValue,
      offset_unit: reminder.offsetUnit,
      local_time: reminder.localTime,
    })),
  });
}

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string;
  userAgent: string;
};

export async function registerPersonalPushSubscription(input: PushSubscriptionInput) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("register_push_subscription", {
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
    p_device_label: input.deviceLabel,
    p_user_agent: input.userAgent,
  }).single();
}

export async function removePersonalPushSubscription(endpoint: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("remove_push_subscription", { p_endpoint: endpoint });
}

export async function sendPersonalTestPush(subscriptionEndpoint: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.functions.invoke("send-reminders", {
    body: { mode: "test", subscriptionEndpoint },
  });
}
