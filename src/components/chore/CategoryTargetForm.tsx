"use client";

import { Check, Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/state";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import { WEEKDAYS } from "@/domain/chores/recurrence";
import { formatMonthDay } from "@/domain/formatters/dates";
import { formatRecurrence } from "@/domain/formatters/recurrence";
import type { DateOnly } from "@/domain/dates/date-only";
import type { ScheduleValues } from "@/lib/validation/chore-plan";

type Subtask = { id: string; title: string };
const frequencies = [["daily", "Every day"], ["interval_days", "Every N days"], ["weekly", "Every week"], ["interval_weeks", "Every N weeks"], ["monthly", "Every month"]] as const;

export function CategoryTargetForm({ action, initialSchedule, subtasks, initialApplicableSubtaskIds }: Readonly<{
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initialSchedule: ScheduleValues; subtasks: Subtask[]; initialApplicableSubtaskIds: string[];
}>) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [applicable, setApplicable] = useState(() => new Set(initialApplicableSubtaskIds));
  const [editing, setEditing] = useState<"schedule" | "subtasks" | null>(null);
  const recurrence = formatRecurrence(schedule);
  const cancel = () => { setSchedule(initialSchedule); setApplicable(new Set(initialApplicableSubtaskIds)); setEditing(null); };
  const toggle = (id: string) => setApplicable((current) => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  const controls = () => <div className="target-settings__form-actions"><SubmitButton pendingLabel="Saving…">Save</SubmitButton><AppButton type="button" variant="tertiary" onClick={cancel}>Cancel</AppButton></div>;

  return <form action={formAction} className="target-settings">
    <input name="recurrenceType" type="hidden" value={schedule.recurrenceType} />
    <input name="intervalCount" type="hidden" value={schedule.intervalCount} />
    <input name="anchorDate" type="hidden" value={schedule.anchorDate} />
    {schedule.weekdays.map((day) => <input key={day} name="weekdays" type="hidden" value={day} />)}
    {schedule.recurrenceType === "monthly" ? <input name="dayOfMonth" type="hidden" value={schedule.dayOfMonth} /> : null}
    {[...applicable].map((id) => <input key={id} name="applicableSubtaskIds" type="hidden" value={id} />)}
    <Card className="target-settings__section">
      <div className="target-settings__heading"><div><p className="eyebrow">Schedule</p>{editing !== "schedule" ? <p className="target-settings__summary">{recurrence} · Starts {formatMonthDay(schedule.anchorDate as DateOnly)}</p> : null}</div>
        {editing !== "schedule" ? <AppButton type="button" variant="tertiary" className="icon-button" aria-label="Edit schedule" onClick={() => setEditing("schedule")}><Pencil aria-hidden="true" size={18} /></AppButton> : null}</div>
      {editing === "schedule" ? <div className="target-settings__editor">
        <div className="target-settings__schedule-row"><label>How often<select aria-label="How often" className="text-field" value={schedule.recurrenceType} onChange={(event) => setSchedule({ ...schedule, recurrenceType: event.target.value as ScheduleValues["recurrenceType"] })}>{frequencies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Starts<input aria-label="Starts" className="text-field" type="date" value={schedule.anchorDate} onChange={(event) => setSchedule({ ...schedule, anchorDate: event.target.value })} required /></label></div>
        {["interval_days", "interval_weeks"].includes(schedule.recurrenceType) ? <label className="field-label">Repeat every<input aria-label="Repeat every" className="text-field" type="number" min={1} max={52} value={schedule.intervalCount} onChange={(event) => setSchedule({ ...schedule, intervalCount: Number(event.target.value) })} required /></label> : null}
        {["weekly", "interval_weeks"].includes(schedule.recurrenceType) ? <fieldset className="target-settings__weekdays"><legend>Repeat on</legend>{WEEKDAYS.map((day) => <label key={day.value}><input type="checkbox" aria-label={day.label} checked={schedule.weekdays.includes(day.value)} onChange={() => setSchedule({ ...schedule, weekdays: schedule.weekdays.includes(day.value) ? schedule.weekdays.filter((value) => value !== day.value) : [...schedule.weekdays, day.value].sort() })} />{day.shortLabel}</label>)}{state.fieldErrors?.weekdays?.[0] ? <p className="field-error">{state.fieldErrors.weekdays[0]}</p> : null}</fieldset> : null}
        {schedule.recurrenceType === "monthly" ? <label className="field-label">Day of the month<input aria-label="Day of the month" className="text-field" type="number" min={1} max={31} value={schedule.dayOfMonth} onChange={(event) => setSchedule({ ...schedule, dayOfMonth: Number(event.target.value) })} required /></label> : null}{controls()}
      </div> : null}
    </Card>
    <Card className="target-settings__section">
      <div className="target-settings__heading"><div><p className="eyebrow">Subtasks</p>{editing !== "subtasks" ? <ul className="target-settings__subtask-summary">{subtasks.filter((subtask) => applicable.has(subtask.id)).map((subtask) => <li key={subtask.id}><Check aria-hidden="true" size={16} />{subtask.title}</li>)}</ul> : null}</div>
        {editing !== "subtasks" ? <AppButton type="button" variant="tertiary" className="icon-button" aria-label="Edit included subtasks" onClick={() => setEditing("subtasks")}><Pencil aria-hidden="true" size={18} /></AppButton> : null}</div>
      {editing === "subtasks" ? <div className="target-settings__editor"><p className="muted-copy">Choose which Category subtasks apply to this target.</p><div className="room-picker">{subtasks.map((subtask) => <label key={subtask.id}><input type="checkbox" checked={applicable.has(subtask.id)} onChange={() => toggle(subtask.id)} />{subtask.title}</label>)}</div>{!subtasks.length ? <p className="muted-copy">This Category has no subtasks yet.</p> : null}{controls()}</div> : null}
    </Card>
    <FormMessage state={state} />
  </form>;
}
