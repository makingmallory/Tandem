import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { ChoreStatusForm } from "@/components/chore/ChoreStatusForm";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getChore } from "@/data/chores/queries";
import { getRoomContext } from "@/data/rooms/queries";
import { getRoutineDetails } from "@/data/routines/queries";
import { ChoreRemoveForm } from "@/components/chore/ChoreRemoveForm";
import { getCurrentHousehold } from "@/data/household/queries";
import { getChoreOccurrenceSummary } from "@/data/occurrences/queries";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { todayDateOnly, type DateOnly } from "@/domain/dates/date-only";
import { formatMonthDay, formatTime } from "@/domain/formatters/dates";
import { formatRecurrence } from "@/domain/formatters/recurrence";
import { getCurrentUser } from "@/data/auth/queries";
import { getPersonalChoreReminders } from "@/data/reminders/queries";
import { ReminderForm } from "@/components/reminder/ReminderForm";
import { CategoryTargetForm } from "@/components/chore/CategoryTargetForm";
import { InlineScheduleEditor } from "@/components/chore/InlineScheduleEditor";
import { StandaloneChoreDetailsEditor } from "@/components/chore/StandaloneChoreDetailsEditor";
import { updateCategoryTargetAction, updateChoreAction, updateChoreScheduleAction } from "@/actions/chores";

export default async function ChoreDetailsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, household, user] = await Promise.all([params, getCurrentHousehold(), getCurrentUser()]);
  if (!household || !user) redirect("/setup");
  const [chore, occurrenceSummary, reminder, roomContext] = await Promise.all([
    getChore(household.id, id),
    getChoreOccurrenceSummary(household.id, id),
    getPersonalChoreReminders(household.id, id, user.id),
    getRoomContext(household.id),
  ]);
  if (!chore) notFound();
  const routine = chore.routine_id ? await getRoutineDetails(household.id, chore.routine_id) : null;
  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);

  const recurrence = formatRecurrence({
    recurrenceType: chore.recurrence_type,
    intervalCount: chore.interval_count,
    weekdays: chore.weekdays,
    dayOfMonth: chore.day_of_month,
  });
  const roomName = chore.room_id ? roomContext.rooms.find((room) => room.id === chore.room_id)?.name : undefined;
  const kind = routine ? routine.routine.kind ?? "category" : "chore";
  const variantName = routine?.variants.find((variant) => variant.id === chore.variant_id)?.name;
  const categoryTarget = routine?.routine.kind === "category";
  const excludedSubtasks = new Set(routine?.exclusions.filter((exclusion) => exclusion.chore_id === chore.id).map((exclusion) => exclusion.subtask_id));

  return (
    <PageShell
      title={kind === "category" ? "Category Details" : "Chore Details"}
      variant="detail"
      backHref="/chores"
    >
      <div className="page-stack">
        <Card className="chore-hero" tinted>
          <ChoreIcon iconKey={chore.icon_key} accentKey={chore.accent_key} size="large" />
          <div className="chore-hero__copy">
            <Pill tone={chore.is_active ? "active" : "paused"}>{chore.retired_at ? "Removed" : chore.is_active ? "Active" : "Paused"}</Pill>
            <h2>{chore.name}</h2>
            {roomName ? <p>{roomName}</p> : null}
            {variantName ? <p>{variantName}</p> : null}
            <p>{recurrence}</p>
          </div>
        </Card>

        {!chore.retired_at ? <>
          {categoryTarget && routine ? <CategoryTargetForm action={updateCategoryTargetAction.bind(null, chore.id)}
            initialSchedule={{ recurrenceType: chore.recurrence_type, intervalCount: chore.interval_count, anchorDate: chore.anchor_date,
              weekdays: chore.weekdays ?? [], dayOfMonth: chore.day_of_month ?? 1 }}
            subtasks={routine.subtasks} initialApplicableSubtaskIds={routine.subtasks.filter((subtask) => !excludedSubtasks.has(subtask.id)).map((subtask) => subtask.id)} /> :
            <InlineScheduleEditor action={updateChoreScheduleAction.bind(null, chore.id)} initialSchedule={{ recurrenceType: chore.recurrence_type, intervalCount: chore.interval_count, anchorDate: chore.anchor_date, weekdays: chore.weekdays ?? [], dayOfMonth: chore.day_of_month ?? 1 }} />}
          <Card className="target-settings__section"><ReminderForm compact choreId={chore.id} reminders={reminder} fallbackTimeZone={HOUSEHOLD_TIME_ZONE} recurrenceType={chore.recurrence_type} intervalCount={chore.interval_count} /></Card>
          {!routine ? <StandaloneChoreDetailsEditor action={updateChoreAction.bind(null, chore.id)} initialValues={{ name: chore.name, description: chore.description ?? "", iconKey: chore.icon_key, accentKey: chore.accent_key }} schedule={{ recurrenceType: chore.recurrence_type, intervalCount: chore.interval_count, anchorDate: chore.anchor_date, weekdays: chore.weekdays ?? [], dayOfMonth: chore.day_of_month ?? 1 }} roomName={roomName} /> : null}
          {routine ? <Link className="app-button app-button--secondary target-settings__parent-link" href={`/chores/${chore.id}/edit`}>Edit {kind === "category" ? "category" : "chore"} &amp; targets</Link> : null}
        </> : <p className="muted-copy">This chore has been removed. Its history is kept.</p>}

        {occurrenceSummary.actionable && !chore.retired_at ? (
          <section className="section-stack" aria-labelledby="current-occurrence-heading">
            <h2 className="section-heading" id="current-occurrence-heading">Current or next occurrence</h2>
            <ul className="occurrence-list">
              <OccurrenceCard occurrence={occurrenceSummary.actionable} today={today} showDate />
            </ul>
          </section>
        ) : null}

        {occurrenceSummary.latestCompleted?.completion ? (
          <Card>
            <p className="eyebrow">Latest completion</p>
            <p className="definition-card__value">
              {occurrenceSummary.latestCompleted.completion.completer
                ? `Done by ${occurrenceSummary.latestCompleted.completion.completer.display_name}`
                : "Completed"}
            </p>
            <p className="muted-copy">
              {formatMonthDay(occurrenceSummary.latestCompleted.scheduled_date as DateOnly)} · {formatTime(
                occurrenceSummary.latestCompleted.completion.completed_at,
                HOUSEHOLD_TIME_ZONE,
              )}
            </p>
            {occurrenceSummary.latestCompleted.checklist?.length ? <ul className="occurrence-list">
              <OccurrenceCard occurrence={occurrenceSummary.latestCompleted} today={today} showDate />
            </ul> : null}
          </Card>
        ) : null}

        {!chore.retired_at ? <>
          <ChoreStatusForm choreId={chore.id} isActive={chore.is_active} kind={kind} />
          {roomContext.available ? <div className="section-stack">
            {!chore.routine_id || chore.room_id || chore.variant_id ? <ChoreRemoveForm choreId={chore.id} roomTarget={Boolean(chore.room_id || chore.variant_id)} /> : null}
            {chore.routine_id ? <ChoreRemoveForm choreId={chore.id} entireRoutine kind={kind} /> : null}
          </div> : null}
        </> : null}
      </div>
    </PageShell>
  );
}
