"use client";

import { useActionState } from "react";
import { joinHouseholdAction } from "@/actions/household";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

export function JoinHouseholdForm({ initialCode = "" }: Readonly<{ initialCode?: string }>) {
  const [state, formAction] = useActionState(joinHouseholdAction, INITIAL_ACTION_STATE);

  return (
    <form action={formAction} className="form-stack">
      <TextField
        id="invite-code"
        name="inviteCode"
        label="Invite code"
        defaultValue={initialCode}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={12}
        required
        error={state.fieldErrors?.inviteCode?.[0]}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Joining household…">Join household</SubmitButton>
    </form>
  );
}
