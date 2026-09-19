"use client";

import { useActionState } from "react";
import { toggleChoreAction } from "@/actions/chores";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ChoreStatusForm({ choreId, isActive }: Readonly<{ choreId: string; isActive: boolean }>) {
  const action = toggleChoreAction.bind(null, choreId, !isActive);
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);

  return (
    <form action={formAction} className="status-form">
      <SubmitButton variant="secondary" pendingLabel={isActive ? "Pausing…" : "Resuming…"}>
        {isActive ? "Pause chore" : "Resume chore"}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
