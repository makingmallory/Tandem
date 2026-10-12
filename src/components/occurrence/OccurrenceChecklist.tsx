"use client";
import { Check } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { setOccurrenceSubtaskAction } from "@/actions/occurrences";
import { useLocalHouseholdMutation } from "@/components/providers/RealtimeHouseholdProvider";
import type { Database } from "@/data/supabase/types";

export function OccurrenceChecklist({ occurrenceId, steps, readOnly = false }: Readonly<{
  occurrenceId: string; steps: Database["public"]["Tables"]["occurrence_subtasks"]["Row"][]; readOnly?: boolean;
}>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mutationId = useId();
  const { setMutationPending } = useLocalHouseholdMutation();
  return <div className="occurrence-checklist" aria-busy={pending}>
    <ul aria-label="Subtasks">{steps.map((step) => {
      const completed = Boolean(step.completed_at);
      return <li key={step.id}>
      <label className={`occurrence-checklist__item${completed ? " occurrence-checklist__item--completed" : ""}`}>
        <input className="occurrence-checklist__input" type="checkbox" checked={completed} disabled={pending || readOnly}
        onChange={(event) => {
          const checked = event.target.checked;
          setError(null); setMutationPending(mutationId, true);
          startTransition(async () => {
            try {
              const result = await setOccurrenceSubtaskAction(occurrenceId, step.id, checked);
              if (result.status === "error") setError(result.formError ?? "We could not save this subtask.");
            } catch { setError("We could not save this subtask. Please try again."); }
            finally { setMutationPending(mutationId, false); }
          });
        }} /><span className="occurrence-checklist__control" aria-hidden="true"><Check size={14} strokeWidth={2.75} /></span><span>{step.title}</span></label>
    </li>;
    })}</ul>
    {pending ? <p className="muted-copy" role="status">Saving checklist…</p> : null}
    {error ? <p className="field-error" role="alert">{error}</p> : null}
  </div>;
}
