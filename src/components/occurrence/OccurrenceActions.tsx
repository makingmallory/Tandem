"use client";

import { CalendarClock, Check, Ellipsis, LoaderCircle, Pencil, SkipForward } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { addDays } from "@/domain/dates/date-only";

type OccurrenceActionsProps = {
  occurrenceId: string;
  choreId: string;
  choreName: string;
  status: "scheduled" | "completed" | "skipped";
  scheduledDate: DateOnly;
  today?: DateOnly;
  compact?: boolean;
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

export function OccurrenceActions({
  occurrenceId,
  choreId,
  choreName,
  status,
  scheduledDate,
  today,
  compact = false,
}: Readonly<OccurrenceActionsProps>) {
  const router = useRouter();
  const [completionState, completionAction] = useActionState(
    (status === "completed" ? undoOccurrenceAction : completeOccurrenceAction).bind(null, occurrenceId),
    INITIAL_ACTION_STATE,
  );
  const [skipState, skipAction] = useActionState(skipOccurrenceAction.bind(null, occurrenceId), INITIAL_ACTION_STATE);
  const [rescheduleState, rescheduleAction] = useActionState(
    rescheduleOccurrenceAction.bind(null, occurrenceId),
    INITIAL_ACTION_STATE,
  );
  const rescheduleFeedbackState = rescheduleState.status === "success"
    && rescheduleState.rescheduledDate !== scheduledDate
    ? INITIAL_ACTION_STATE
    : rescheduleState;

  useEffect(() => {
    if (rescheduleState.status === "success") router.refresh();
  }, [rescheduleState.status, router]);

  return (
    <div className={`occurrence-actions${compact ? " occurrence-actions--compact" : ""}`} data-testid="occurrence-action-cluster">
      {status === "scheduled" || status === "completed" ? (
        <form action={completionAction} className="occurrence-actions__primary">
          <RealtimeMutationGuard />
          <SubmitButton
            aria-label={status === "completed" ? `Mark ${choreName} as incomplete` : `Mark ${choreName} as complete`}
            aria-pressed={status === "completed"}
            className={`occurrence-actions__completion${compact ? " occurrence-actions__completion--compact" : ""}`}
            pendingLabel={compact ? <><LoaderCircle aria-hidden="true" size={18} /><span className="visually-hidden">Saving</span></> : "Saving…"}
            variant={status === "completed" ? "secondary" : "primary"}
          >
            {compact ? (
              <>
                {status === "completed" ? <Check aria-hidden="true" size={20} strokeWidth={3} /> : null}
                <span className="visually-hidden">{status === "completed" ? "Completed" : "Incomplete"}</span>
              </>
            ) : status === "completed" ? "Completed" : "Mark as Done"}
          </SubmitButton>
        </form>
      ) : null}
      {compact && status === "scheduled" && today ? <details className="occurrence-actions__more occurrence-actions__more--compact">
        <summary className="icon-button" aria-label={`More actions for ${choreName}`}>
          <Ellipsis aria-hidden="true" size={21} />
        </summary>
        <div className="occurrence-actions__panel">
          <form action={rescheduleAction}>
            <RealtimeMutationGuard />
            <input name="scheduledDate" type="hidden" value={addDays(today, 1)} />
            <SubmitButton variant="tertiary" pendingLabel="Moving…">
              <CalendarClock aria-hidden="true" size={17} /> Tomorrow
            </SubmitButton>
          </form>
          <form action={rescheduleAction} className="occurrence-reschedule-form">
            <RealtimeMutationGuard />
            <label htmlFor={`reschedule-${occurrenceId}`}><CalendarClock aria-hidden="true" size={17} /> Choose another date</label>
            <input id={`reschedule-${occurrenceId}`} name="scheduledDate" type="date" defaultValue={scheduledDate} required />
            <SubmitButton variant="secondary" pendingLabel="Moving…">Reschedule</SubmitButton>
            <FormMessage state={rescheduleFeedbackState} />
          </form>
          <form action={skipAction}>
            <RealtimeMutationGuard />
            <SubmitButton variant="tertiary" pendingLabel="Skipping…">
              <SkipForward aria-hidden="true" size={17} /> Skip this time
            </SubmitButton>
            <FormMessage state={skipState} />
          </form>
        </div>
      </details> : null}
      {!compact ? <details className="occurrence-actions__more">
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
              <FormMessage state={rescheduleFeedbackState} />
            </form>
            </>
          ) : null}
          <Link className="app-button app-button--tertiary" href={`/chores/${choreId}/edit`}>
            <Pencil aria-hidden="true" size={17} /> Edit chore
          </Link>
        </div>
      </details> : null}
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
