"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/actions/state";
import { formErrorState, successState, validationErrorState } from "@/actions/state";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { getCurrentUser } from "@/data/auth/queries";
import { getChore } from "@/data/chores/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { createChoreWithOccurrences, setChoreActive, updateChore } from "@/data/occurrences/mutations";
import { todayDateOnly, type DateOnly } from "@/domain/dates/date-only";
import { generateOccurrenceDates, occurrenceHorizonEnd } from "@/domain/recurrence/generateOccurrences";
import { choreFormDataToInput, choreSchema } from "@/lib/validation/chore";

function choreErrorMessage(code?: string) {
  if (code === "42501") return "You do not have access to update chores in this household.";
  if (code === "PGRST116" || code === "P0002") return "That chore could not be found.";
  return "We could not save this chore or generate its schedule. Check your connection and try again.";
}

function generateFutureDates(input: {
  recurrenceType: "daily" | "interval_days" | "weekly" | "interval_weeks" | "monthly";
  intervalCount: number;
  anchorDate: string;
  weekdays: number[] | null;
  dayOfMonth: number | null;
}, start: DateOnly) {
  return generateOccurrenceDates(
    { ...input, anchorDate: input.anchorDate as DateOnly },
    start,
    occurrenceHorizonEnd(start),
  );
}

async function getChoreContext() {
  const [user, household] = await Promise.all([getCurrentUser(), getCurrentHousehold()]);
  return user && household ? { user, household } : null;
}

export async function createChoreAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = choreSchema.safeParse(choreFormDataToInput(formData));
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const context = await getChoreContext();
  if (!context) return formErrorState("Please sign in and join a household first.");

  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  const occurrenceDates = generateFutureDates(parsed.data, today);
  const { data, error } = await createChoreWithOccurrences(
    context.household.id,
    parsed.data,
    occurrenceDates,
  );
  if (error || !data) return formErrorState(choreErrorMessage(error?.code));

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/chores");
  redirect(`/chores/${data.id}`);
}

export async function updateChoreAction(
  choreId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = choreSchema.safeParse(choreFormDataToInput(formData));
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const context = await getChoreContext();
  if (!context) return formErrorState("Please sign in and join a household first.");

  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  const occurrenceDates = generateFutureDates(parsed.data, today);
  const { error } = await updateChore(
    context.household.id,
    choreId,
    parsed.data,
    today,
    occurrenceDates,
  );
  if (error) return formErrorState(choreErrorMessage(error.code));

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/chores");
  revalidatePath(`/chores/${choreId}`);
  redirect(`/chores/${choreId}`);
}

export async function toggleChoreAction(
  choreId: string,
  nextIsActive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const context = await getChoreContext();
  if (!context) return formErrorState("Please sign in and join a household first.");

  const chore = await getChore(context.household.id, choreId);
  if (!chore) return formErrorState("That chore could not be found.");
  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  const occurrenceDates = nextIsActive
    ? generateFutureDates({
        recurrenceType: chore.recurrence_type,
        intervalCount: chore.interval_count,
        anchorDate: chore.anchor_date,
        weekdays: chore.weekdays,
        dayOfMonth: chore.day_of_month,
      }, today)
    : [];
  const { error } = await setChoreActive(
    context.household.id,
    choreId,
    nextIsActive,
    today,
    occurrenceDates,
  );
  if (error) return formErrorState(choreErrorMessage(error.code));

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/chores");
  revalidatePath(`/chores/${choreId}`);
  return successState(nextIsActive ? "Chore resumed." : "Chore paused.");
}
