"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveReminderAction } from "@/actions/reminders";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import type { ChoreReminderRow } from "@/data/supabase/types";

export function ReminderForm({
  choreId,
  reminder,
  fallbackTimeZone,
}: Readonly<{ choreId: string; reminder: ChoreReminderRow | null; fallbackTimeZone: string }>) {
  const [state, formAction] = useActionState(saveReminderAction.bind(null, choreId), INITIAL_ACTION_STATE);
  const timezone = reminder?.timezone ?? fallbackTimeZone;

  return (
    <form action={formAction} className="reminder-form">
      <div>
        <p className="eyebrow">Your reminder</p>
        <p className="muted-copy">Personal to you. This does not assign or claim the shared chore.</p>
      </div>
      <label className="toggle-row">
        <input name="enabled" type="checkbox" defaultChecked={reminder?.enabled ?? false} />
        <span>Remind me on the due date</span>
      </label>
      <label className="field-label" htmlFor={`reminder-time-${choreId}`}>
        Reminder time
        <input
          className="text-field"
          id={`reminder-time-${choreId}`}
          name="localTime"
          type="time"
          defaultValue={reminder?.local_time.slice(0, 5) ?? "10:00"}
          required
        />
      </label>
      <input name="timezone" type="hidden" value={timezone} />
      <p className="muted-copy">Timezone: {timezone}</p>
      <div className="button-row">
        <SubmitButton pendingLabel="Saving reminder…">Save your reminder</SubmitButton>
        <Link className="app-button app-button--secondary" href="/settings/notifications">Notification settings</Link>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
