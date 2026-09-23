"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/state";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { CHORE_ACCENTS } from "@/domain/chores/accents";
import { CHORE_ICONS } from "@/domain/chores/icons";
import { WEEKDAYS, type RecurrenceType } from "@/domain/chores/recurrence";
import { isDateOnly } from "@/domain/dates/date-only";
import { formatMonthDay } from "@/domain/formatters/dates";
import { formatRecurrence } from "@/domain/formatters/recurrence";

type ChoreFormValues = {
  name: string;
  description: string;
  iconKey: string;
  accentKey: string;
  recurrenceType: RecurrenceType;
  intervalCount: number;
  anchorDate: string;
  weekdays: number[];
  dayOfMonth: number;
};

type ChoreFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues: ChoreFormValues;
  mode: "create" | "edit";
};

const FREQUENCIES: ReadonlyArray<{ value: RecurrenceType; label: string; description: string }> = [
  { value: "daily", label: "Every day", description: "A little rhythm for every day." },
  { value: "interval_days", label: "Every N days", description: "Choose the number of days between repeats." },
  { value: "weekly", label: "Every week", description: "Pick one or more days each week." },
  { value: "interval_weeks", label: "Every N weeks", description: "A flexible multi-week routine." },
  { value: "monthly", label: "Every month", description: "Repeat on a numbered day of the month." },
];

export function ChoreForm({ action, initialValues, mode }: Readonly<ChoreFormProps>) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [iconKey, setIconKey] = useState(initialValues.iconKey);
  const [accentKey, setAccentKey] = useState(initialValues.accentKey);
  const [recurrenceType, setRecurrenceType] = useState(initialValues.recurrenceType);
  const [intervalCount, setIntervalCount] = useState(initialValues.intervalCount);
  const [anchorDate, setAnchorDate] = useState(initialValues.anchorDate);
  const [weekdays, setWeekdays] = useState(initialValues.weekdays);
  const [dayOfMonth, setDayOfMonth] = useState(initialValues.dayOfMonth);

  const preview = formatRecurrence({
    recurrenceType,
    intervalCount,
    weekdays,
    dayOfMonth,
  });

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  return (
    <form action={formAction} className="chore-form">
      <Card className="chore-form__section">
        <div>
          <p className="eyebrow">The chore</p>
          <h2 className="section-heading">What needs a little love?</h2>
        </div>
        <TextField
          id="chore-name"
          name="name"
          label="Chore name"
          defaultValue={initialValues.name}
          placeholder="Water the plants"
          maxLength={100}
          required
          autoComplete="off"
          error={state.fieldErrors?.name?.[0]}
        />
      </Card>

      <Card className="chore-form__section">
        <fieldset className="picker-fieldset" aria-describedby={state.fieldErrors?.iconKey?.[0] ? "icon-picker-error" : undefined}>
          <legend className="field-label">Choose an icon</legend>
          <div className="icon-picker">
            {CHORE_ICONS.map(({ key, label, icon: Icon }) => (
              <label className="picker-option" key={key} title={label}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="iconKey"
                  value={key}
                  checked={iconKey === key}
                  onChange={() => setIconKey(key)}
                />
                <span className="picker-option__icon">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <span className="visually-hidden">{label}</span>
              </label>
            ))}
          </div>
          {state.fieldErrors?.iconKey?.[0] ? <p className="field-error" id="icon-picker-error">{state.fieldErrors.iconKey[0]}</p> : null}
        </fieldset>

        <fieldset className="picker-fieldset" aria-describedby={state.fieldErrors?.accentKey?.[0] ? "accent-picker-error" : undefined}>
          <legend className="field-label">Pick a color</legend>
          <div className="accent-picker">
            {CHORE_ACCENTS.map((accent) => (
              <label className="accent-option" key={accent.key} title={accent.label}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="accentKey"
                  value={accent.key}
                  checked={accentKey === accent.key}
                  onChange={() => setAccentKey(accent.key)}
                />
                <span style={{ background: `var(${accent.cssVariable})` }} />
                <span className="visually-hidden">{accent.label}</span>
              </label>
            ))}
          </div>
          {state.fieldErrors?.accentKey?.[0] ? <p className="field-error" id="accent-picker-error">{state.fieldErrors.accentKey[0]}</p> : null}
        </fieldset>
      </Card>

      <Card className="chore-form__section">
        <fieldset className="picker-fieldset">
          <legend>
            <span className="eyebrow">The rhythm</span>
            <span className="section-heading">How often?</span>
          </legend>
          <div className="frequency-grid">
            {FREQUENCIES.map((frequency) => (
              <label className="frequency-option" key={frequency.value}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="recurrenceType"
                  value={frequency.value}
                  checked={recurrenceType === frequency.value}
                  onChange={() => setRecurrenceType(frequency.value)}
                />
                <span className="frequency-option__copy">
                  <strong>{frequency.label}</strong>
                  <small>{frequency.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          id="anchor-date"
          name="anchorDate"
          label="Starts"
          type="date"
          value={anchorDate}
          onChange={(event) => setAnchorDate(event.target.value)}
          hint="This date anchors the schedule. No chores are scheduled before it."
          required
          error={state.fieldErrors?.anchorDate?.[0]}
        />

        {recurrenceType === "interval_days" || recurrenceType === "interval_weeks" ? (
          <TextField
            id="interval-count"
            name="intervalCount"
            label={recurrenceType === "interval_days" ? "Repeat every how many days?" : "Repeat every how many weeks?"}
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            value={intervalCount}
            onChange={(event) => setIntervalCount(Number(event.target.value))}
            required
            error={state.fieldErrors?.intervalCount?.[0]}
          />
        ) : (
          <input type="hidden" name="intervalCount" value="1" />
        )}

        {recurrenceType === "weekly" || recurrenceType === "interval_weeks" ? (
          <fieldset className="picker-fieldset" aria-describedby={state.fieldErrors?.weekdays?.[0] ? "weekdays-error" : undefined}>
            <legend className="field-label">Repeat on</legend>
            <div className="weekday-picker">
              {WEEKDAYS.map((weekday) => (
                <label className="weekday-option" key={weekday.value} title={weekday.label}>
                  <input
                    className="visually-hidden"
                    type="checkbox"
                    name="weekdays"
                    value={weekday.value}
                    checked={weekdays.includes(weekday.value)}
                    aria-invalid={Boolean(state.fieldErrors?.weekdays?.[0])}
                    onChange={() => toggleWeekday(weekday.value)}
                  />
                  <span>{weekday.shortLabel}</span>
                  <span className="visually-hidden">{weekday.label}</span>
                </label>
              ))}
            </div>
            {state.fieldErrors?.weekdays?.[0] ? <p className="field-error" id="weekdays-error">{state.fieldErrors.weekdays[0]}</p> : null}
          </fieldset>
        ) : null}

        {recurrenceType === "monthly" ? (
          <TextField
            id="day-of-month"
            name="dayOfMonth"
            label="Day of the month"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(Number(event.target.value))}
            required
            hint="For shorter months, this will later fall on the last valid day."
            error={state.fieldErrors?.dayOfMonth?.[0]}
          />
        ) : null}

        <div className="recurrence-preview" aria-live="polite">
          <span>Looks like</span>
          <strong>{preview}</strong>
          {isDateOnly(anchorDate) ? <small>Starts {formatMonthDay(anchorDate)}</small> : null}
        </div>
      </Card>

      <Card className="chore-form__section">
        <div className="field-stack">
          <label className="field-label" htmlFor="chore-notes">Notes (optional)</label>
          <textarea
            className="text-field text-area"
            id="chore-notes"
            name="description"
            defaultValue={initialValues.description}
            placeholder="Add anything helpful for the household…"
            maxLength={500}
            rows={4}
            aria-invalid={Boolean(state.fieldErrors?.description)}
            aria-describedby={state.fieldErrors?.description?.[0] ? "chore-notes-error" : undefined}
          />
          {state.fieldErrors?.description?.[0] ? <p className="field-error" id="chore-notes-error">{state.fieldErrors.description[0]}</p> : null}
        </div>
      </Card>

      <FormMessage state={state} />
      <SubmitButton pendingLabel={mode === "create" ? "Creating chore…" : "Saving changes…"}>
        {mode === "create" ? "Create chore" : "Save changes"}
      </SubmitButton>
    </form>
  );
}
