import { redirect } from "next/navigation";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { WeekSelector } from "@/components/occurrence/WeekSelector";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { getCurrentHousehold } from "@/data/household/queries";
import { getOccurrencesForRange } from "@/data/occurrences/queries";
import { occurrenceFixture } from "@/data/occurrences/test-fixtures";
import { addDays, isDateOnly, startOfWeek, todayDateOnly, type DateOnly } from "@/domain/dates/date-only";
import { formatLongDate } from "@/domain/formatters/dates";
import { isShellTestMode } from "@/lib/test-mode";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const query = await searchParams;
  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  const requestedDate = typeof query.date === "string" && isDateOnly(query.date) ? query.date : today;
  const selectedDate = requestedDate as DateOnly;
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  let occurrences;
  if (isShellTestMode()) {
    occurrences = [
      occurrenceFixture(selectedDate, 0),
      occurrenceFixture(addDays(weekStart, 2), 1),
      occurrenceFixture(addDays(weekStart, 5), 2),
    ];
  } else {
    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
    occurrences = await getOccurrencesForRange(household.id, weekStart, weekEnd);
  }
  const selectedOccurrences = occurrences.filter((item) => item.scheduled_date === selectedDate);

  return (
    <PageShell title="Calendar" variant="root">
      <div className="page-stack">
        <WeekSelector days={days} selectedDate={selectedDate} occurrences={occurrences} />
        <section className="section-stack" aria-labelledby="selected-date-heading">
          <div>
            <p className="eyebrow">Selected day</p>
            <h2 className="section-heading" id="selected-date-heading">{formatLongDate(selectedDate)}</h2>
          </div>
          {selectedOccurrences.length ? (
            <ul className="occurrence-list">
              {selectedOccurrences.map((occurrence) => (
                <OccurrenceCard occurrence={occurrence} today={today} key={occurrence.id} />
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing scheduled here" description="This day is clear. Pick another day to see what is coming up." />
          )}
        </section>
      </div>
    </PageShell>
  );
}
