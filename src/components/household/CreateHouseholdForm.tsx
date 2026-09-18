"use client";

import { useActionState } from "react";
import { createHouseholdAction } from "@/actions/household";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

export function CreateHouseholdForm() {
  const [state, formAction] = useActionState(createHouseholdAction, INITIAL_ACTION_STATE);

  return (
    <form action={formAction} className="form-stack">
      <TextField
        id="household-name"
        name="name"
        label="Household name"
        placeholder="Our Home"
        autoComplete="organization"
        required
        error={state.fieldErrors?.name?.[0]}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating your home…">Create household</SubmitButton>
    </form>
  );
}
