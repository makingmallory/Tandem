import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { Pill } from "@/components/ui/Pill";
import type { OccurrenceWithChore } from "@/data/occurrences/types";
import { formatMonthDay } from "@/domain/formatters/dates";
import type { DateOnly } from "@/domain/dates/date-only";

type OccurrenceCardProps = {
  occurrence: OccurrenceWithChore;
  today: DateOnly;
  showDate?: boolean;
};

export function OccurrenceCard({ occurrence, today, showDate = false }: Readonly<OccurrenceCardProps>) {
  const isOverdue = occurrence.status === "scheduled" && occurrence.scheduled_date < today;
  return (
    <li className="occurrence-card">
      <ChoreIcon iconKey={occurrence.chore.icon_key} accentKey={occurrence.chore.accent_key} />
      <div className="occurrence-card__body">
        <span className="occurrence-card__name">{occurrence.chore.name}</span>
        {showDate ? (
          <span className="occurrence-card__context">Due {formatMonthDay(occurrence.scheduled_date as DateOnly)}</span>
        ) : occurrence.is_rescheduled ? (
          <span className="occurrence-card__context">Rescheduled</span>
        ) : null}
      </div>
      {isOverdue ? <Pill tone="overdue">Overdue</Pill> : null}
      {occurrence.status === "skipped" ? <Pill tone="paused">Skipped</Pill> : null}
    </li>
  );
}

