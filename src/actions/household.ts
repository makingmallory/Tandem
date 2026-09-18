"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/actions/state";
import { formErrorState, validationErrorState } from "@/actions/state";
import { getCurrentUser } from "@/data/auth/queries";
import { createHousehold, joinHousehold } from "@/data/household/mutations";
import { householdNameSchema, inviteCodeSchema } from "@/lib/validation/household";

function householdErrorMessage(code?: string, message?: string) {
  if (code === "23505" || message?.includes("already belong")) {
    return "You already belong to a household.";
  }
  if (code === "P0002" || message?.includes("not found")) {
    return "We could not find a household with that invite code.";
  }
  if (code === "42501") {
    return "Please sign in before setting up a household.";
  }
  return "We could not update your household. Please try again.";
}

export async function createHouseholdAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = householdNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const user = await getCurrentUser();
  if (!user) return formErrorState("Please sign in and try again.");

  const { error } = await createHousehold(parsed.data.name);
  if (error) return formErrorState(householdErrorMessage(error.code, error.message));

  revalidatePath("/", "layout");
  redirect("/");
}

export async function joinHouseholdAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = inviteCodeSchema.safeParse({ inviteCode: formData.get("inviteCode") });
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const user = await getCurrentUser();
  if (!user) return formErrorState("Please sign in and try again.");

  const { error } = await joinHousehold(parsed.data.inviteCode);
  if (error) return formErrorState(householdErrorMessage(error.code, error.message));

  revalidatePath("/", "layout");
  redirect("/");
}
