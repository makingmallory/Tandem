"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/actions/state";
import { formErrorState, successState, validationErrorState } from "@/actions/state";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import {
  registerPersonalPushSubscription,
  removePersonalPushSubscription,
  savePersonalReminder,
  sendPersonalTestPush,
  type PushSubscriptionInput,
} from "@/data/reminders/mutations";
import { reminderFormDataToInput, reminderSchema } from "@/lib/validation/reminder";

function reminderError(code?: string) {
  if (code === "42501") return "You can only manage your own reminders and notification devices.";
  if (code === "22023") return "Check notification timing, duplicates, and the chore cadence.";
  return "We could not save your reminder. Check your connection and try again.";
}

export async function saveReminderAction(
  choreId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previousState;
  const parsed = reminderSchema.safeParse(reminderFormDataToInput(formData));
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);
  const [user, household] = await Promise.all([getCurrentUser(), getCurrentHousehold()]);
  if (!user || !household) return formErrorState("Please sign in and join a household first.");
  const { error } = await savePersonalReminder(household.id, choreId, parsed.data);
  if (error) return formErrorState(reminderError(error.code));
  refresh();
  return parsed.data.enabled
    ? successState(`${parsed.data.reminders.length} notification${parsed.data.reminders.length === 1 ? "" : "s"} saved.`)
    : successState("Reminder off.", "neutral");
}

export async function registerPushSubscriptionAction(input: PushSubscriptionInput) {
  if (!input.endpoint || !input.p256dh || !input.auth) return { ok: false, message: "The browser did not provide a valid push subscription." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in first." };
  const { error } = await registerPersonalPushSubscription(input);
  if (error) return { ok: false, message: reminderError(error.code) };
  refresh();
  return { ok: true, message: "Notifications are enabled on this device." };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in first." };
  const { error } = await removePersonalPushSubscription(endpoint);
  if (error) return { ok: false, message: reminderError(error.code) };
  refresh();
  return { ok: true, message: "Notifications are off on this device." };
}

export async function sendTestPushAction(subscriptionEndpoint: string) {
  if (!subscriptionEndpoint) return { ok: false, message: "This device does not have an active push subscription." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in first." };
  const { data, error } = await sendPersonalTestPush(subscriptionEndpoint);
  if (error || !data || data.sent !== 1) {
    return { ok: false, message: "The test notification could not be sent to this device. Check the Edge Function setup." };
  }
  return { ok: true, message: "Test notification sent." };
}
