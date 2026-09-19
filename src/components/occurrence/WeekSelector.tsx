import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { OccurrenceWithChore } from "@/data/occurrences/types";
import { addDays, type DateOnly } from "@/domain/dates/date-only";
import { formatDayName, formatDayNumber, formatMonthDay } from "@/domain/formatters/dates";

type WeekSelectorProps = {
  days: readonly DateOnly[];
  selectedDate: DateOnly;
  occurrences: readonly OccurrenceWithChore[];
};

export function WeekSelector({ days, selectedDate, occurrences }: Readonly<WeekSelectorProps>) {
  const firstDay = days[0]!;
  const lastDay = days.at(-1)!;
  const countFor = (date: DateOnly) => occurrences.filter(
    (item) => item.scheduled_date === date && item.status === "scheduled",
  ).length;

  return (
    <section className="week-picker" aria-label="Choose a day">
      <div className="week-picker__controls">
        <Link className="week-picker__arrow" href={`/calendar?date=${addDays(firstDay, -7)}`} aria-label="Previous week">
          <ChevronLeft aria-hidden="true" size={20} />
        </Link>
        <span>{formatMonthDay(firstDay)} – {formatMonthDay(lastDay)}</span>
        <Link className="week-picker__arrow" href={`/calendar?date=${addDays(firstDay, 7)}`} aria-label="Next week">
          <ChevronRight aria-hidden="true" size={20} />
        </Link>
      </div>
      <div className="week-picker__days">
        {days.map((date) => {
          const count = countFor(date);
          return (
            <Link
              className="week-day"
              data-selected={date === selectedDate || undefined}
              href={`/calendar?date=${date}`}
              aria-current={date === selectedDate ? "date" : undefined}
              key={date}
            >
              <span className="week-day__name">{formatDayName(date)}</span>
              <strong>{formatDayNumber(date)}</strong>
              <span className="week-day__count" aria-label={`${count} ${count === 1 ? "chore" : "chores"}`}>{count}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
