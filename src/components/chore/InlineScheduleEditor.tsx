"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/state";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import { WEEKDAYS } from "@/domain/chores/recurrence";
import type { DateOnly } from "@/domain/dates/date-only";
import { formatMonthDay } from "@/domain/formatters/dates";
import { formatRecurrence } from "@/domain/formatters/recurrence";
import type { ScheduleValues } from "@/lib/validation/chore-plan";

const frequencies = [["daily", "Every day"], ["interval_days", "Every N days"], ["weekly", "Every week"], ["interval_weeks", "Every N weeks"], ["monthly", "Every month"]] as const;

export function ScheduleInputs({ schedule }: Readonly<{ schedule: ScheduleValues }>) {
  return <>
    <input name="recurrenceType" type="hidden" value={schedule.recurrenceType} />
    <input name="intervalCount" type="hidden" value={schedule.intervalCount} />
    <input name="anchorDate" type="hidden" value={schedule.anchorDate} />
    {schedule.weekdays.map((day) => <input key={day} name="weekdays" type="hidden" value={day} />)}
    {schedule.recurrenceType === "monthly" ? <input name="dayOfMonth" type="hidden" value={schedule.dayOfMonth} /> : null}
  </>;
}

export function InlineScheduleEditor({ action, initialSchedule, extraInputs = [] }: Readonly<{
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initialSchedule: ScheduleValues;
  extraInputs?: ReadonlyArray<{ name: string; value: string }>;
}>) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [editing, setEditing] = useState(false);
  const cancel = () => { setSchedule(initialSchedule); setEditing(false); };

  return <form action={formAction} className="target-settings">
    <ScheduleInputs schedule={schedule} />
    {extraInputs.map((input, index) => <input key={`${input.name}-${input.value}-${index}`} name={input.name} type="hidden" value={input.value} />)}
    <Card className="target-settings__section">
      <div className="target-settings__heading"><div><p className="eyebrow">Schedule</p>{!editing ? <p className="target-settings__summary">{formatRecurrence(schedule)} · Starts {formatMonthDay(schedule.anchorDate as DateOnly)}</p> : null}</div>
        {!editing ? <AppButton type="button" variant="tertiary" className="icon-button" aria-label="Edit schedule" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={18} /></AppButton> : null}</div>
      {editing ? <div className="target-settings__editor">
        <div className="target-settings__schedule-row"><label>How often<select aria-label="How often" className="text-field" value={schedule.recurrenceType} onChange={(event) => setSchedule({ ...schedule, recurrenceType: event.target.value as ScheduleValues["recurrenceType"] })}>{frequencies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Starts<input aria-label="Starts" className="text-field" type="date" value={schedule.anchorDate} onChange={(event) => setSchedule({ ...schedule, anchorDate: event.target.value })} required /></label></div>
        {["interval_days", "interval_weeks"].includes(schedule.recurrenceType) ? <label className="field-label">Repeat every<input aria-label="Repeat every" className="text-field" type="number" min={1} max={52} value={schedule.intervalCount} onChange={(event) => setSchedule({ ...schedule, intervalCount: Number(event.target.value) })} required /></label> : null}
        {["weekly", "interval_weeks"].includes(schedule.recurrenceType) ? <fieldset className="target-settings__weekdays"><legend>Repeat on</legend>{WEEKDAYS.map((day) => <label key={day.value}><input type="checkbox" aria-label={day.label} checked={schedule.weekdays.includes(day.value)} onChange={() => setSchedule({ ...schedule, weekdays: schedule.weekdays.includes(day.value) ? schedule.weekdays.filter((value) => value !== day.value) : [...schedule.weekdays, day.value].sort() })} />{day.shortLabel}</label>)}{state.fieldErrors?.weekdays?.[0] ? <p className="field-error">{state.fieldErrors.weekdays[0]}</p> : null}</fieldset> : null}
        {schedule.recurrenceType === "monthly" ? <label className="field-label">Day of the month<input aria-label="Day of the month" className="text-field" type="number" min={1} max={31} value={schedule.dayOfMonth} onChange={(event) => setSchedule({ ...schedule, dayOfMonth: Number(event.target.value) })} required /></label> : null}
        <div className="target-settings__form-actions"><SubmitButton pendingLabel="Saving…">Save</SubmitButton><AppButton type="button" variant="tertiary" onClick={cancel}>Cancel</AppButton></div>
      </div> : null}
    </Card>
    <FormMessage state={state} />
  </form>;
}
