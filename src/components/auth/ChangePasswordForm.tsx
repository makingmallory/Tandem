"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, INITIAL_ACTION_STATE);

  return (
    <form action={formAction} className="form-stack">
      <TextField
        id="password"
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="Use at least 8 characters."
        error={state.fieldErrors?.password?.[0]}
      />
      <TextField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Updating password…">Update password</SubmitButton>
    </form>
  );
}
