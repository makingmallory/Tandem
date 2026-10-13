"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/state";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { ScheduleInputs } from "@/components/chore/InlineScheduleEditor";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import { CHORE_ACCENTS } from "@/domain/chores/accents";
import { CHORE_ICONS } from "@/domain/chores/icons";
import type { ScheduleValues } from "@/lib/validation/chore-plan";

export function StandaloneChoreDetailsEditor({ action, initialValues, schedule, roomName }: Readonly<{
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues: { name: string; description: string; iconKey: string; accentKey: string };
  schedule: ScheduleValues;
  roomName?: string;
}>) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [editing, setEditing] = useState(false);
  const cancel = () => setEditing(false);
  return <form action={formAction}>
    <ScheduleInputs schedule={schedule} />
    <Card className="target-settings__section">
      <div className="target-settings__heading"><div><p className="eyebrow">Details</p>{!editing ? <p className="target-settings__summary">{initialValues.description || "No notes"} · {roomName ?? "No room"}</p> : null}</div>
        {!editing ? <AppButton type="button" variant="tertiary" className="icon-button" aria-label="Edit chore details" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={18} /></AppButton> : null}</div>
      {editing ? <div className="target-settings__editor">
        <label className="field-label">Chore name<input aria-label="Chore name" className="text-field" name="name" defaultValue={initialValues.name} maxLength={100} required /></label>
        <label className="field-label">Icon<select aria-label="Icon" className="text-field" name="iconKey" defaultValue={initialValues.iconKey}>{CHORE_ICONS.map((icon) => <option key={icon.key} value={icon.key}>{icon.label}</option>)}</select></label>
        <label className="field-label">Color<select aria-label="Color" className="text-field" name="accentKey" defaultValue={initialValues.accentKey}>{CHORE_ACCENTS.map((accent) => <option key={accent.key} value={accent.key}>{accent.label}</option>)}</select></label>
        <label className="field-label">Notes (optional)<textarea aria-label="Notes" className="text-field text-area" name="description" defaultValue={initialValues.description} maxLength={500} rows={3} /></label>
        <div className="target-settings__form-actions"><SubmitButton pendingLabel="Saving…">Save</SubmitButton><AppButton type="button" variant="tertiary" onClick={cancel}>Cancel</AppButton></div>
      </div> : null}
    </Card>
    <FormMessage state={state} />
  </form>;
}
