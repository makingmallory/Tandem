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
import { parseChorePlan } from "@/lib/validation/chore-plan";
import { saveChorePlan, retireChore } from "@/data/routines/mutations";
import { getRoomContext } from "@/data/rooms/queries";
import { PHASE8_PENDING_MESSAGE } from "@/data/rooms/copy";
import { getCategoryFeaturesAvailable } from "@/data/routines/capabilities";

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
  if (formData.has("schedulePlan")) return savePlan(null, formData);
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
  if (formData.has("schedulePlan")) return savePlan(choreId, formData);
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
  if (!chore || chore.retired_at) return formErrorState("That chore could not be found.");
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

async function savePlan(choreId: string | null, formData: FormData): Promise<ActionState> {
  const context = await getChoreContext();
  if (!context) return formErrorState("Please sign in and join a household first.");
  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  const parsed = parseChorePlan(formData, today);
  if ("error" in parsed) return { ...formErrorState(parsed.error!), fieldErrors: parsed.fieldErrors
    ? Object.fromEntries(Object.entries(parsed.fieldErrors).filter(([, messages]) => messages?.length)) as Record<string, string[]> : undefined };
  const { available } = await getRoomContext(context.household.id);
  let destination = choreId;
  if (available) {
    const features = await getCategoryFeaturesAvailable(context.household.id);
    const current = choreId ? await getChore(context.household.id, choreId) : null;
    if (!features && (parsed.variants.length || parsed.subtasks.some((task) => task.excludedTargets.length) ||
      (parsed.kind === "chore" && parsed.roomIds.length > 0) ||
      (parsed.kind === "category" && !current?.routine_id && !parsed.roomIds.length && !parsed.subtasks.length))) {
      return formErrorState("Apply the pending Category checklist/Variants migration before saving these options. Existing room-based Categories can still be edited.");
    }
    const { data, error } = await saveChorePlan(context.household.id, choreId, parsed.payload, today);
    if (error || !data?.length) return formErrorState(choreErrorMessage(error?.code));
    destination = data.find((chore) => chore.id === choreId)?.id ?? data[0]!.id;
  } else {
    if (parsed.roomIds.length || parsed.subtasks.length || parsed.variants.length || parsed.kind === "category") return formErrorState(PHASE8_PENDING_MESSAGE);
    const dates = generateFutureDates(parsed.input, today);
    const result = choreId
      ? await updateChore(context.household.id, choreId, parsed.input, today, dates)
      : await createChoreWithOccurrences(context.household.id, parsed.input, dates);
    if (result.error || !result.data) return formErrorState(choreErrorMessage(result.error?.code));
    destination = result.data.id;
  }
  revalidatePath("/", "layout");
  redirect(`/chores/${destination}`);
}

export async function retireChoreAction(choreId: string, entireRoutine: boolean,
  _state: ActionState, _form: FormData): Promise<ActionState> {
  void _state; void _form;
  const context = await getChoreContext();
  if (!context) return formErrorState("Please sign in and join a household first.");
  const { error } = await retireChore(context.household.id, choreId, entireRoutine);
  if (error) return formErrorState("We could not remove this chore. Please try again.");
  revalidatePath("/", "layout");
  redirect("/chores");
}
