"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/actions/state";
import { formErrorState, successState, validationErrorState } from "@/actions/state";
import {
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  updateCurrentUserPassword,
} from "@/data/auth/mutations";
import { getCurrentHousehold } from "@/data/household/queries";
import { changePasswordSchema, safeRedirectPath, signInSchema, signUpSchema } from "@/lib/validation/auth";

function fieldsFrom(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key) ?? ""]));
}

function authErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials":
      return "That email and password do not match.";
    case "email_not_confirmed":
      return "This account is waiting for email confirmation. Disable Confirm Email for the private setup described in the README.";
    case "user_already_exists":
    case "email_exists":
      return "An account already uses that email address.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "New account creation is currently closed. An existing user can still sign in.";
    case "weak_password":
      return "Choose a stronger password with at least 8 characters.";
    default:
      return "We could not complete that request. Please try again.";
  }
}

export async function signInAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse(fieldsFrom(formData, ["email", "password", "next"]));
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const { data, error } = await signInWithPassword(parsed.data.email, parsed.data.password);
  if (error || !data.user) {
    return formErrorState(authErrorMessage(error?.code));
  }

  const requestedPath = safeRedirectPath(parsed.data.next);
  if (requestedPath) redirect(requestedPath);

  const household = await getCurrentHousehold();
  redirect(household ? "/" : "/setup");
}

export async function signUpAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(
    fieldsFrom(formData, ["displayName", "email", "password", "confirmPassword", "next"]),
  );
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const { data, error } = await signUpWithPassword({
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return formErrorState(authErrorMessage(error.code));

  if (!data.session) {
    return successState(
      "Your account was created, but Supabase is waiting for email confirmation. Turn Confirm Email off for this private two-person setup, then sign in.",
    );
  }

  redirect(safeRedirectPath(parsed.data.next) ?? "/setup");
}

export async function changePasswordAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse(
    fieldsFrom(formData, ["password", "confirmPassword"]),
  );
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);

  const { error } = await updateCurrentUserPassword(parsed.data.password);
  if (error) {
    const code = "code" in error ? error.code : undefined;
    return formErrorState(authErrorMessage(code));
  }

  return successState("Your password has been updated.");
}

export async function signOutAction() {
  await signOutCurrentUser();
  redirect("/auth/sign-in");
}
