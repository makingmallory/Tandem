"use server";

import { refresh, revalidatePath } from "next/cache";
import type { ActionState } from "@/actions/state";
import { formErrorState, successState } from "@/actions/state";
import {
  completeOccurrence,
  rescheduleOccurrence,
  skipOccurrence,
  undoOccurrenceCompletion,
} from "@/data/completions/mutations";
import { getCurrentHousehold } from "@/data/household/queries";
import { isDateOnly } from "@/domain/dates/date-only";

function mutationErrorMessage(code?: string) {
  if (code === "42501") return "You do not have access to update this occurrence.";
  if (code === "P0002") return "That occurrence could not be found.";
  if (code === "23505") return "That date already has this chore scheduled.";
  if (code === "22023") return "That action is not available for this occurrence.";
  return "We could not update this chore. Check your connection and try again.";
}

function refreshOccurrenceViews() {
  // A Server Action response already carries a refreshed RSC payload for the
  // initiating view. Realtime updates every other open household client.
  revalidatePath("/");
  revalidatePath("/calendar");
  refresh();
}

async function householdId() {
  return (await getCurrentHousehold())?.id ?? null;
}

export async function completeOccurrenceAction(
  occurrenceId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const household = await householdId();
  if (!household) return formErrorState("Please sign in and join a household first.");
  const { error } = await completeOccurrence(household, occurrenceId);
  if (error) return formErrorState(mutationErrorMessage(error.code));
  refreshOccurrenceViews();
  return successState("Chore marked done.");
}

export async function undoOccurrenceAction(
  occurrenceId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const household = await householdId();
  if (!household) return formErrorState("Please sign in and join a household first.");
  const { error } = await undoOccurrenceCompletion(household, occurrenceId);
  if (error) return formErrorState(mutationErrorMessage(error.code));
  refreshOccurrenceViews();
  return successState("Chore marked incomplete.");
}

export async function skipOccurrenceAction(
  occurrenceId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const household = await householdId();
  if (!household) return formErrorState("Please sign in and join a household first.");
  const { error } = await skipOccurrence(household, occurrenceId);
  if (error) return formErrorState(mutationErrorMessage(error.code));
  refreshOccurrenceViews();
  return successState("Occurrence skipped.");
}

export async function rescheduleOccurrenceAction(
  occurrenceId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const scheduledDate = String(formData.get("scheduledDate") ?? "");
  if (!isDateOnly(scheduledDate)) return formErrorState("Choose a valid new date.");
  const household = await householdId();
  if (!household) return formErrorState("Please sign in and join a household first.");
  const { data, error } = await rescheduleOccurrence(household, occurrenceId, scheduledDate);
  if (error) return formErrorState(mutationErrorMessage(error.code));
  if (!data || data.id !== occurrenceId || data.scheduled_date !== scheduledDate) {
    return formErrorState("We could not confirm the new date. Please try again.");
  }
  refreshOccurrenceViews();
  return { ...successState("Occurrence rescheduled."), rescheduledDate: scheduledDate };
}
