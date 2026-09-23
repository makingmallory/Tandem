"use client";

import { CalendarClock, Ellipsis, Pencil, SkipForward } from "lucide-react";
import Link from "next/link";
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
  choreId: string;
  choreName: string;
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

export function OccurrenceActions({ occurrenceId, choreId, choreName, status, scheduledDate }: Readonly<OccurrenceActionsProps>) {
  const [completionState, completionAction] = useActionState(
    (status === "completed" ? undoOccurrenceAction : completeOccurrenceAction).bind(null, occurrenceId),
    INITIAL_ACTION_STATE,
  );
  const [skipState, skipAction] = useActionState(skipOccurrenceAction.bind(null, occurrenceId), INITIAL_ACTION_STATE);
  const [rescheduleState, rescheduleAction] = useActionState(
    rescheduleOccurrenceAction.bind(null, occurrenceId),
    INITIAL_ACTION_STATE,
  );

  return (
    <div className="occurrence-actions" data-testid="occurrence-action-cluster">
      {status === "scheduled" || status === "completed" ? (
        <form action={completionAction} className="occurrence-actions__primary">
          <RealtimeMutationGuard />
          <SubmitButton
            aria-label={status === "completed" ? `Mark ${choreName} as incomplete` : `Mark ${choreName} as complete`}
            className="occurrence-actions__completion"
            pendingLabel="Saving…"
            variant={status === "completed" ? "secondary" : "primary"}
          >
            {status === "completed" ? "Completed" : "Mark as Done"}
          </SubmitButton>
        </form>
      ) : null}
      <details className="occurrence-actions__more">
        <summary className="icon-button" aria-label={`More actions for ${choreName}`}>
          <Ellipsis aria-hidden="true" size={21} />
        </summary>
        <div className="occurrence-actions__panel">
          {status === "scheduled" ? (
            <>
            <form action={skipAction}>
              <RealtimeMutationGuard />
              <SubmitButton variant="tertiary" pendingLabel="Skipping…">
                <SkipForward aria-hidden="true" size={17} /> Skip this time
              </SubmitButton>
              <FormMessage state={skipState} />
            </form>
            <form action={rescheduleAction} className="occurrence-reschedule-form">
              <RealtimeMutationGuard />
              <label htmlFor={`reschedule-${occurrenceId}`}><CalendarClock aria-hidden="true" size={17} /> Move to</label>
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
            </>
          ) : null}
          <Link className="app-button app-button--tertiary" href={`/chores/${choreId}/edit`}>
            <Pencil aria-hidden="true" size={17} /> Edit chore
          </Link>
        </div>
      </details>
      {completionState.status !== "idle" && completionState.formError ? (
        <p className="occurrence-action-feedback occurrence-action-feedback--error" role="alert">
          {completionState.formError}
        </p>
      ) : completionState.status === "success" && completionState.successMessage ? (
        <p className="occurrence-action-feedback" role="status">{completionState.successMessage}</p>
      ) : null}
    </div>
  );
}
