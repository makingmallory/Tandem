import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { OccurrenceActions } from "@/components/occurrence/OccurrenceActions";
import { Pill } from "@/components/ui/Pill";
import type { OccurrenceWithChore } from "@/data/occurrences/types";
import { formatMonthDay, formatTime } from "@/domain/formatters/dates";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import type { DateOnly } from "@/domain/dates/date-only";

type OccurrenceCardProps = {
  occurrence: OccurrenceWithChore;
  today: DateOnly;
  showDate?: boolean;
};

export function OccurrenceCard({ occurrence, today, showDate = false }: Readonly<OccurrenceCardProps>) {
  const isOverdue = occurrence.status === "scheduled" && occurrence.scheduled_date < today;
  const completion = occurrence.completion;
  return (
    <li className="occurrence-card" data-status={occurrence.status}>
      <ChoreIcon iconKey={occurrence.chore.icon_key} accentKey={occurrence.chore.accent_key} />
      <div className="occurrence-card__body">
        <span className="occurrence-card__name">{occurrence.chore.name}</span>
        {showDate ? (
          <span className="occurrence-card__context">Due {formatMonthDay(occurrence.scheduled_date as DateOnly)}</span>
        ) : occurrence.is_rescheduled ? (
          <span className="occurrence-card__context">Rescheduled</span>
        ) : null}
        {completion ? (
          <span className="occurrence-card__completion">
            ✓ {completion.completer ? `Done by ${completion.completer.display_name}` : "Done"} at {formatTime(
              completion.completed_at,
              HOUSEHOLD_TIME_ZONE,
            )}
          </span>
        ) : null}
      </div>
      <div className="occurrence-card__state">
        {isOverdue ? <Pill tone="overdue">Overdue</Pill> : null}
        {occurrence.status === "completed" ? <Pill tone="active">Completed</Pill> : null}
        {occurrence.status === "skipped" ? <Pill tone="paused">Skipped</Pill> : null}
      </div>
      <OccurrenceActions
        occurrenceId={occurrence.id}
        status={occurrence.status}
        scheduledDate={occurrence.scheduled_date as DateOnly}
      />
    </li>
  );
}
