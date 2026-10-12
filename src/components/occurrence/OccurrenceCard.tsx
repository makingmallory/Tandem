import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { OccurrenceActions } from "@/components/occurrence/OccurrenceActions";
import type { OccurrenceWithChore } from "@/data/occurrences/types";
import { formatMonthDay, formatTime } from "@/domain/formatters/dates";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import type { DateOnly } from "@/domain/dates/date-only";
import Link from "next/link";
import { OccurrenceChecklist } from "@/components/occurrence/OccurrenceChecklist";

type OccurrenceCardProps = {
  occurrence: OccurrenceWithChore;
  today: DateOnly;
  showDate?: boolean;
  presentation?: "default" | "home";
};

export function OccurrenceCard({
  occurrence,
  today,
  showDate = false,
  presentation = "default",
}: Readonly<OccurrenceCardProps>) {
  const isOverdue = occurrence.status === "scheduled" && occurrence.scheduled_date < today;
  const completion = occurrence.completion;
  const name = occurrence.title_snapshot ?? occurrence.chore.name;
  const room = occurrence.checklist_materialized ? occurrence.room_name_snapshot : occurrence.chore.room?.name;
  const variant = occurrence.checklist_materialized ? occurrence.variant_name_snapshot : occurrence.chore.variant?.name;
  const choreLabel = [name, room, variant].filter(Boolean).join(" · ");
  const checklist = occurrence.checklist ?? [];
  const progress = checklist.filter((step) => step.completed_at).length;
  const inProgress = occurrence.status === "scheduled" && progress > 0 && progress < checklist.length;
  const context = [showDate ? `Due ${formatMonthDay(occurrence.scheduled_date as DateOnly)}` : null,
    occurrence.is_rescheduled ? "Rescheduled" : null, isOverdue ? "Overdue" : null,
    occurrence.status === "skipped" ? "Skipped" : null, inProgress ? `In progress (${progress}/${checklist.length})` : null].filter(Boolean).join(" · ");
  return (
    <li className={`occurrence-card${checklist.length ? " occurrence-card--category" : ""}`} data-status={inProgress ? "in_progress" : occurrence.status} data-presentation={presentation}>
      <ChoreIcon iconKey={occurrence.chore.icon_key} accentKey={occurrence.chore.accent_key} />
      <div className="occurrence-card__body">
        <Link className="occurrence-card__name" href={`/chores/${occurrence.chore.id}`} title={choreLabel}>{name}</Link>
        {room ? <span className="occurrence-card__location">{room}</span> : null}
        {variant ? <span className="occurrence-card__variant">{variant}</span> : null}
        <span className="occurrence-card__context">
          {context}
        </span>
        {completion ? (
          <span className="occurrence-card__completion">
            ✓ {completion.completer ? `Done by ${completion.completer.display_name}` : "Done"} at {formatTime(
              completion.completed_at,
              HOUSEHOLD_TIME_ZONE,
            )}
          </span>
        ) : null}
      </div>
      {!occurrence.chore.retired_at ? <OccurrenceActions
        occurrenceId={occurrence.id}
        choreId={occurrence.chore.id}
        choreName={choreLabel}
        status={occurrence.status}
        scheduledDate={occurrence.scheduled_date as DateOnly}
        today={today}
        compact={presentation === "home"}
        hasChecklist={checklist.length > 0}
        category={occurrence.chore.routine?.kind === "category" || checklist.length > 0}
      /> : null}
      {checklist.length ? <OccurrenceChecklist occurrenceId={occurrence.id} steps={checklist}
        readOnly={occurrence.status === "skipped" || Boolean(occurrence.chore.retired_at)} /> : null}
    </li>
  );
}
