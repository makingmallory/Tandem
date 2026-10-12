"use client";
import { useActionState } from "react";
import { retireChoreAction } from "@/actions/chores";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ChoreRemoveForm({ choreId, entireRoutine = false, roomTarget = false, kind = "category" }: Readonly<{
  choreId: string; entireRoutine?: boolean; roomTarget?: boolean; kind?: "chore" | "category";
}>) {
  const [state, action] = useActionState(retireChoreAction.bind(null, choreId, entireRoutine), INITIAL_ACTION_STATE);
  const label = entireRoutine ? `Delete entire ${kind}` : roomTarget ? "Remove this target" : "Delete chore";
  return <form action={action} onSubmit={(event) => {
    if (!window.confirm(`${label}? ${entireRoutine ? "All targets" : "This chore"} will stop. Completion history will be kept.`)) event.preventDefault();
  }}><SubmitButton variant="tertiary" pendingLabel="Removing…">{label}</SubmitButton><FormMessage state={state} /></form>;
}
