import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { OccurrenceActions } from "@/components/occurrence/OccurrenceActions";
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
        <span className="occurrence-card__context">
          {showDate ? `Due ${formatMonthDay(occurrence.scheduled_date as DateOnly)}` : null}
          {occurrence.is_rescheduled ? `${showDate ? " · " : ""}Rescheduled` : null}
          {isOverdue ? `${showDate || occurrence.is_rescheduled ? " · " : ""}Overdue` : null}
          {occurrence.status === "skipped" ? "Skipped" : null}
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
      <OccurrenceActions
        occurrenceId={occurrence.id}
        choreId={occurrence.chore.id}
        choreName={occurrence.chore.name}
        status={occurrence.status}
        scheduledDate={occurrence.scheduled_date as DateOnly}
      />
    </li>
  );
}
