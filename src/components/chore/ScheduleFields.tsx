"use client";

import { TextField } from "@/components/ui/TextField";
import { WEEKDAYS } from "@/domain/chores/recurrence";
import { formatRecurrence } from "@/domain/formatters/recurrence";
import { formatMonthDay } from "@/domain/formatters/dates";
import { isDateOnly } from "@/domain/dates/date-only";
import type { ScheduleValues } from "@/lib/validation/chore-plan";

const frequencies = [["daily", "Every day"], ["interval_days", "Every N days"], ["weekly", "Every week"],
  ["interval_weeks", "Every N weeks"], ["monthly", "Every month"]] as const;
export function ScheduleFields({ value, onChange, prefix = "", errors = {} }: Readonly<{
  value: ScheduleValues; onChange: (value: ScheduleValues) => void; prefix?: string; errors?: Record<string, string[]>;
}>) {
  const id = (name: string) => `${prefix}${name}`;
  return <div className="section-stack">
    <fieldset className="picker-fieldset"><legend className="field-label">How often?</legend>
      <div className="frequency-grid">{frequencies.map(([type, label]) => <label className="frequency-option" key={type}>
        <input className="visually-hidden" name={id("recurrenceType")} type="radio" value={type}
          checked={value.recurrenceType === type} onChange={() => onChange({ ...value, recurrenceType: type })} />
        <span className="frequency-option__copy"><strong>{label}</strong></span>
      </label>)}</div>
    </fieldset>
    <TextField id={id("anchorDate")} name={id("anchorDate")} label="Starts" type="date" value={value.anchorDate}
      onChange={(event) => onChange({ ...value, anchorDate: event.target.value })} required error={errors.anchorDate?.[0]} />
    {["interval_days", "interval_weeks"].includes(value.recurrenceType) ?
      <TextField id={id("intervalCount")} name={id("intervalCount")}
        label={value.recurrenceType === "interval_days" ? "Repeat every how many days?" : "Repeat every how many weeks?"}
        type="number" min={1} max={52} value={value.intervalCount} required error={errors.intervalCount?.[0]}
        onChange={(event) => onChange({ ...value, intervalCount: Number(event.target.value) })} /> : null}
    {["weekly", "interval_weeks"].includes(value.recurrenceType) ? <fieldset className="picker-fieldset">
      <legend className="field-label">Repeat on</legend>
      <div className="weekday-picker">{WEEKDAYS.map((day) => <label className="weekday-option" key={day.value}>
        <input className="visually-hidden" type="checkbox" aria-label={day.label} name={id("weekdays")} value={day.value}
          checked={value.weekdays.includes(day.value)} onChange={() => onChange({ ...value,
            weekdays: value.weekdays.includes(day.value) ? value.weekdays.filter((item) => item !== day.value) : [...value.weekdays, day.value].sort() })} />
        <span>{day.shortLabel}</span><span className="visually-hidden">{day.label}</span>
      </label>)}</div>
      {errors.weekdays?.[0] ? <p className="field-error">{errors.weekdays[0]}</p> : null}
    </fieldset> : null}
    {value.recurrenceType === "monthly" ? <TextField id={id("dayOfMonth")} name={id("dayOfMonth")}
      label="Day of the month" type="number" min={1} max={31} value={value.dayOfMonth} required
      onChange={(event) => onChange({ ...value, dayOfMonth: Number(event.target.value) })} error={errors.dayOfMonth?.[0]} /> : null}
    <div className="recurrence-preview" aria-live="polite"><span>Looks like</span><strong>{formatRecurrence(value)}</strong>
      {isDateOnly(value.anchorDate) ? <small>Starts {formatMonthDay(value.anchorDate)}</small> : null}</div>
  </div>;
}
