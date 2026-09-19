"use client";

import { useActionState, useEffect, useId } from "react";
import { useFormStatus } from "react-dom";
import {
  completeOccurrenceAction,
  rescheduleOccurrenceAction,
  skipOccurrenceAction,
  undoOccurrenceAction,
} from "@/actions/occurrences";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { useLocalHouseholdMutation } from "@/components/providers/RealtimeHouseholdProvider";
import type { DateOnly } from "@/domain/dates/date-only";

type OccurrenceActionsProps = {
  occurrenceId: string;
  status: "scheduled" | "completed" | "skipped";
  scheduledDate: DateOnly;
};

function RealtimeMutationGuard() {
  const { pending } = useFormStatus();
  const { setMutationPending } = useLocalHouseholdMutation();
  const mutationId = useId();

  useEffect(() => {
    setMutationPending(mutationId, pending);
    return () => setMutationPending(mutationId, false);
  }, [mutationId, pending, setMutationPending]);

  return null;
}

export function OccurrenceActions({ occurrenceId, status, scheduledDate }: Readonly<OccurrenceActionsProps>) {
  const [completionState, completionAction] = useActionState(
    (status === "completed" ? undoOccurrenceAction : completeOccurrenceAction).bind(null, occurrenceId),
    INITIAL_ACTION_STATE,
  );
  const [skipState, skipAction] = useActionState(skipOccurrenceAction.bind(null, occurrenceId), INITIAL_ACTION_STATE);
  const [rescheduleState, rescheduleAction] = useActionState(
    rescheduleOccurrenceAction.bind(null, occurrenceId),
    INITIAL_ACTION_STATE,
  );

  if (status === "skipped") return null;

  return (
    <div className="occurrence-actions">
      <form action={completionAction}>
        <RealtimeMutationGuard />
        <SubmitButton
          variant={status === "completed" ? "tertiary" : "primary"}
          pendingLabel={status === "completed" ? "Undoing…" : "Saving…"}
        >
          {status === "completed" ? "Mark incomplete" : "Mark as Done"}
        </SubmitButton>
        <FormMessage state={completionState} />
      </form>
      {status === "scheduled" ? (
        <details className="occurrence-actions__more">
          <summary>More options</summary>
          <div className="occurrence-actions__panel">
            <form action={skipAction}>
              <RealtimeMutationGuard />
              <SubmitButton variant="tertiary" pendingLabel="Skipping…">Skip this time</SubmitButton>
              <FormMessage state={skipState} />
            </form>
            <form action={rescheduleAction} className="occurrence-reschedule-form">
              <RealtimeMutationGuard />
              <label htmlFor={`reschedule-${occurrenceId}`}>Move to</label>
              <input
                id={`reschedule-${occurrenceId}`}
                name="scheduledDate"
                type="date"
                defaultValue={scheduledDate}
                required
              />
              <SubmitButton variant="secondary" pendingLabel="Moving…">Reschedule</SubmitButton>
              <FormMessage state={rescheduleState} />
            </form>
          </div>
        </details>
      ) : null}
    </div>
  );
}
