"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { saveReminderAction } from "@/actions/reminders";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppButton } from "@/components/ui/AppButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Pill } from "@/components/ui/Pill";
import type { ChoreReminderRow, ChoreRow } from "@/data/supabase/types";
import {
  REMINDER_OFFSET_UNITS,
  reminderMaximumForUnit,
  reminderUnitLabel,
  type ReminderDefinition,
  type ReminderOffsetUnit,
} from "@/lib/validation/reminder";

type ReminderDraft = ReminderDefinition & { key: string };

const REMINDER_MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"] as const;
const REMINDER_HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));

type TimeParts = { hour: string; minute: string; period: "AM" | "PM" };

function timeParts(value: string): TimeParts | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[1]);
  return {
    hour: String(hour24 % 12 || 12),
    minute: match[2]!,
    period: hour24 < 12 ? "AM" : "PM",
  };
}

function toLocalTime(hour: string, minute: string, period: "AM" | "PM") {
  const hour12 = Number(hour);
  const hour24 = (hour12 % 12) + (period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

function displayTime(value: string) {
  const time = timeParts(value);
  return time ? `${time.hour}:${time.minute} ${time.period}` : value;
}

function ReminderTimeSelector({
  notificationNumber,
  value,
  onChange,
}: Readonly<{
  notificationNumber: number;
  value: string;
  onChange: (value: string) => void;
}>) {
  const current = timeParts(value);
  const minuteOnGrid = current ? REMINDER_MINUTES.includes(current.minute as (typeof REMINDER_MINUTES)[number]) : false;
  const hour = current?.hour ?? "";
  const minute = minuteOnGrid ? current!.minute : "";
  const period = current?.period ?? "";

  function update(next: Partial<TimeParts>) {
    const nextHour = next.hour ?? hour;
    const nextMinute = next.minute ?? current?.minute ?? "";
    const nextPeriod = next.period ?? period;
    if (!nextHour || !nextMinute || !nextPeriod) return;
    onChange(toLocalTime(nextHour, nextMinute, nextPeriod));
  }

  return (
    <div className="reminder-builder-row__time">
      <span>Time</span>
      <div className="reminder-time-selector" role="group" aria-label={`Time for notification ${notificationNumber}`}>
        <label>
          <span className="sr-only">Hour for notification {notificationNumber}</span>
          <select
            aria-label={`Hour for notification ${notificationNumber}`}
            className="text-field"
            value={hour}
            onChange={(event) => update({ hour: event.target.value })}
            required
          >
            <option value="" disabled>Hour</option>
            {REMINDER_HOURS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <span aria-hidden="true">:</span>
        <label>
          <span className="sr-only">Minute for notification {notificationNumber}</span>
          <select
            aria-label={`Minute for notification ${notificationNumber}`}
            className="text-field"
            value={minute}
            onChange={(event) => update({ minute: event.target.value })}
            required
          >
            <option value="" disabled>Minute</option>
            {REMINDER_MINUTES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">AM or PM for notification {notificationNumber}</span>
          <select
            aria-label={`AM or PM for notification ${notificationNumber}`}
            className="text-field"
            value={period}
            onChange={(event) => update({ period: event.target.value as TimeParts["period"] })}
            required
          >
            <option value="" disabled>AM/PM</option>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
      </div>
      {!minuteOnGrid ? (
        <p className="reminder-time-selector__warning" role="alert">
          Saved time {displayTime(value)} is not on a 5-minute boundary. Choose a valid minute before saving.
        </p>
      ) : null}
    </div>
  );
}

function existingDrafts(reminders: ChoreReminderRow[], daily: boolean): ReminderDraft[] {
  const drafts = reminders.map((reminder) => ({
    key: reminder.id,
    offsetValue: reminder.offset_value,
    offsetUnit: reminder.offset_unit,
    localTime: reminder.local_time.slice(0, 5),
  }));
  if (daily) {
    return [{
      key: drafts[0]?.key ?? "daily-due",
      offsetValue: 0,
      offsetUnit: "day",
      localTime: drafts[0]?.localTime ?? "10:00",
    }];
  }
  return drafts.length ? drafts : [{ key: "initial-due", offsetValue: 0, offsetUnit: "day", localTime: "10:00" }];
}

export function ReminderForm({
  choreId,
  reminders,
  fallbackTimeZone,
  recurrenceType,
}: Readonly<{
  choreId: string;
  reminders: ChoreReminderRow[];
  fallbackTimeZone: string;
  recurrenceType: ChoreRow["recurrence_type"];
  intervalCount: number;
}>) {
  const [state, formAction] = useActionState(saveReminderAction.bind(null, choreId), INITIAL_ACTION_STATE);
  const [enabled, setEnabled] = useState(reminders.some((reminder) => reminder.enabled));
  const daily = recurrenceType === "daily";
  const [drafts, setDrafts] = useState<ReminderDraft[]>(() => existingDrafts(reminders, daily));
  const nextKey = useRef(0);
  const idBase = useId();
  const timezone = reminders[0]?.timezone ?? fallbackTimeZone;
  const serializedReminders = drafts.map(({ offsetValue, offsetUnit, localTime }) => ({ offsetValue, offsetUnit, localTime }));

  function updateDraft(key: string, update: Partial<ReminderDefinition>) {
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...update } : draft));
  }

  function addNotification() {
    if (drafts.length >= 12) return;
    nextKey.current += 1;
    setDrafts((current) => [...current, {
      key: `new-${nextKey.current}`,
      offsetValue: 1,
      offsetUnit: "day",
      localTime: current.at(-1)?.localTime ?? "10:00",
    }]);
  }

  return (
    <form action={formAction} className="reminder-form">
      <div className="reminder-form__heading">
        <div>
          <p className="eyebrow">Your reminders</p>
          <p className="muted-copy">Personal to you. This does not assign or claim the shared chore.</p>
        </div>
        <Pill tone={enabled ? "active" : "neutral"}>
          {enabled ? `${drafts.length} notification${drafts.length === 1 ? "" : "s"}` : "Notifications off"}
        </Pill>
      </div>

      <label className="switch-row">
        <span>
          <strong>Notifications</strong>
          <small>{enabled ? "On" : "Off"}</small>
        </span>
        <input
          name="enabled"
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span className="switch-control" aria-hidden="true"><span /></span>
      </label>

      {enabled ? (
        <div className="reminder-builder">
          <div className="reminder-builder__heading">
            <span className="field-label">Remind me</span>
            <span className="muted-copy">Every 5 minutes · {timezone}</span>
          </div>
          {drafts.length ? (
            <div className="reminder-builder__rows">
              {drafts.map((draft, index) => {
                const beforeDue = draft.offsetValue > 0;
                const rowId = `${idBase}-${index}`;
                return (
                  <fieldset className="reminder-builder-row" aria-label={`Notification ${index + 1}`} key={draft.key}>
                    <div className="reminder-builder-row__timing">
                      {daily ? (
                        <span className="reminder-builder-row__relation">On the due date</span>
                      ) : (
                        <label>
                          <span className="sr-only">Timing for notification {index + 1}</span>
                          <select
                            aria-label={`Timing for notification ${index + 1}`}
                            className="text-field"
                            value={beforeDue ? "before" : "due"}
                            onChange={(event) => updateDraft(draft.key, event.target.value === "due"
                              ? { offsetValue: 0, offsetUnit: "day" }
                              : { offsetValue: 1, offsetUnit: "day" })}
                          >
                            <option value="due">On the due date</option>
                            <option value="before">Before the due date</option>
                          </select>
                        </label>
                      )}
                      {beforeDue && !daily ? (
                        <div className="reminder-builder-row__offset">
                          <label htmlFor={`${rowId}-value`} className="sr-only">Offset for notification {index + 1}</label>
                          <input
                            aria-label={`Offset for notification ${index + 1}`}
                            className="text-field"
                            id={`${rowId}-value`}
                            inputMode="numeric"
                            max={reminderMaximumForUnit(draft.offsetUnit)}
                            min="1"
                            type="number"
                            value={draft.offsetValue}
                            onChange={(event) => updateDraft(draft.key, { offsetValue: Number(event.target.value) })}
                          />
                          <label htmlFor={`${rowId}-unit`} className="sr-only">Unit for notification {index + 1}</label>
                          <select
                            aria-label={`Unit for notification ${index + 1}`}
                            className="text-field"
                            id={`${rowId}-unit`}
                            value={draft.offsetUnit}
                            onChange={(event) => {
                              const offsetUnit = event.target.value as ReminderOffsetUnit;
                              updateDraft(draft.key, {
                                offsetUnit,
                                offsetValue: Math.min(draft.offsetValue, reminderMaximumForUnit(offsetUnit)),
                              });
                            }}
                          >
                            {REMINDER_OFFSET_UNITS.map((unit) => (
                              <option value={unit} key={unit}>{reminderUnitLabel(unit, draft.offsetValue)}</option>
                            ))}
                          </select>
                          <span>before</span>
                        </div>
                      ) : null}
                    </div>
                    <ReminderTimeSelector
                      notificationNumber={index + 1}
                      value={draft.localTime}
                      onChange={(localTime) => updateDraft(draft.key, { localTime })}
                    />
                    {!daily ? (
                      <AppButton
                        aria-label={`Remove notification ${index + 1}`}
                        className="reminder-builder-row__remove"
                        onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                        type="button"
                        variant="tertiary"
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </AppButton>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>
          ) : <p className="muted-copy">No notifications added yet.</p>}
          {!daily ? (
            <AppButton type="button" variant="secondary" onClick={addNotification} disabled={drafts.length >= 12}>
              <Plus aria-hidden="true" size={18} /> Add notification
            </AppButton>
          ) : null}
          {state.fieldErrors?.reminders?.[0] ? (
            <p className="field-error" role="alert">{state.fieldErrors.reminders[0]}</p>
          ) : null}
        </div>
      ) : null}

      <input name="reminders" type="hidden" value={JSON.stringify(serializedReminders)} />
      <input name="timezone" type="hidden" value={timezone} />
      <div className="button-row">
        <SubmitButton pendingLabel="Saving notifications…">Save notification settings</SubmitButton>
        <Link className="app-button app-button--secondary" href="/settings/notifications">Notification settings</Link>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
