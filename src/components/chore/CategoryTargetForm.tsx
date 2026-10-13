"use client";

import { Check, Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/state";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { InlineScheduleEditor, ScheduleInputs } from "@/components/chore/InlineScheduleEditor";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import type { ScheduleValues } from "@/lib/validation/chore-plan";

type Subtask = { id: string; title: string };

export function CategoryTargetForm({ action, initialSchedule, subtasks, initialApplicableSubtaskIds }: Readonly<{
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initialSchedule: ScheduleValues; subtasks: Subtask[]; initialApplicableSubtaskIds: string[];
}>) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [applicable, setApplicable] = useState(() => new Set(initialApplicableSubtaskIds));
  const [editing, setEditing] = useState(false);
  const toggle = (id: string) => setApplicable((current) => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  const cancel = () => { setApplicable(new Set(initialApplicableSubtaskIds)); setEditing(false); };
  const inputs = [...applicable].map((value) => ({ name: "applicableSubtaskIds", value }));

  return <div className="target-settings">
    <InlineScheduleEditor action={action} initialSchedule={initialSchedule} extraInputs={inputs} />
    <form action={formAction}>
      <ScheduleInputs schedule={initialSchedule} />
      {inputs.map((input) => <input key={input.value} type="hidden" name={input.name} value={input.value} />)}
      <Card className="target-settings__section">
        <div className="target-settings__heading"><div><p className="eyebrow">Subtasks</p>{!editing ? <ul className="target-settings__subtask-summary">{subtasks.filter((subtask) => applicable.has(subtask.id)).map((subtask) => <li key={subtask.id}><Check aria-hidden="true" size={16} />{subtask.title}</li>)}</ul> : null}</div>
          {!editing ? <AppButton type="button" variant="tertiary" className="icon-button" aria-label="Edit included subtasks" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={18} /></AppButton> : null}</div>
        {editing ? <div className="target-settings__editor"><p className="muted-copy">Choose which Category subtasks apply to this target.</p><div className="room-picker">{subtasks.map((subtask) => <label key={subtask.id}><input type="checkbox" checked={applicable.has(subtask.id)} onChange={() => toggle(subtask.id)} />{subtask.title}</label>)}</div>{!subtasks.length ? <p className="muted-copy">This Category has no subtasks yet.</p> : null}<div className="target-settings__form-actions"><SubmitButton pendingLabel="Saving…">Save</SubmitButton><AppButton type="button" variant="tertiary" onClick={cancel}>Cancel</AppButton></div></div> : null}
      </Card>
      <FormMessage state={state} />
    </form>
  </div>;
}
