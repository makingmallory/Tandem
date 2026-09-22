import { Settings2 } from "lucide-react";
import { redirect } from "next/navigation";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { APP_BRAND } from "@/config/brand";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { getCurrentHousehold } from "@/data/household/queries";
import { getOverdueOccurrences, getTodayOccurrences, getUpcomingOccurrences } from "@/data/occurrences/queries";
import { homeOccurrenceFixtures } from "@/data/occurrences/test-fixtures";
import { todayDateOnly } from "@/domain/dates/date-only";
import { formatLongDate } from "@/domain/formatters/dates";
import { occurrenceHorizonEnd } from "@/domain/recurrence/generateOccurrences";
import { isShellTestMode } from "@/lib/test-mode";
import { occurrenceProgress, sortOccurrencesForToday } from "@/domain/occurrences/progress";
import { InstallPromptCard } from "@/components/pwa/InstallPromptCard";

export default async function HomePage() {
  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  let occurrences;
  if (isShellTestMode()) {
    occurrences = homeOccurrenceFixtures(today);
  } else {
    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
    const [todayItems, overdue, upcoming] = await Promise.all([
      getTodayOccurrences(household.id, today),
      getOverdueOccurrences(household.id, today),
      getUpcomingOccurrences(household.id, today, occurrenceHorizonEnd(today)),
    ]);
    occurrences = { today: sortOccurrencesForToday(todayItems), overdue, upcoming };
  }
  const progress = occurrenceProgress(occurrences.today);

  return (
    <PageShell
      title={APP_BRAND.name}
      subtitle={APP_BRAND.tagline}
      variant="root"
      actions={
        <IconButton href="/household" label="Open household settings">
          <Settings2 aria-hidden="true" size={21} strokeWidth={2.2} />
        </IconButton>
      }
    >
      <div className="page-stack">
        <InstallPromptCard />
        <div>
          <p className="eyebrow">Today at home</p>
          <p className="today-date">{formatLongDate(today)}</p>
        </div>

        <Card className="progress-card">
          <div className="progress-card__topline">
            <div>
              <p className="eyebrow">On the list</p>
              <p className="progress-card__value">
                {progress.completed} of {progress.total} done
              </p>
            </div>
          </div>
          <div className="progress-track" aria-label={`${progress.completed} of ${progress.total} chores done`}>
            <span style={{ width: progress.total ? `${(progress.completed / progress.total) * 100}%` : "0%" }} />
          </div>
          <p className="muted-copy">{occurrences.overdue.length} overdue · {occurrences.upcoming.length} coming up</p>
        </Card>

        {occurrences.overdue.length ? (
          <section className="section-stack" aria-labelledby="overdue-heading">
            <h2 className="section-heading" id="overdue-heading">Needs a little catch-up</h2>
            <ul className="occurrence-list">
              {occurrences.overdue.map((occurrence) => (
                <OccurrenceCard occurrence={occurrence} today={today} showDate key={occurrence.id} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="section-stack" aria-labelledby="today-heading">
          <h2 className="section-heading" id="today-heading">Today&apos;s chores</h2>
          {occurrences.today.length ? (
            <ul className="occurrence-list">
              {occurrences.today.map((occurrence) => (
                <OccurrenceCard occurrence={occurrence} today={today} key={occurrence.id} />
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing due today 🎉" description="Enjoy the clean-house victory." />
          )}
        </section>

        {occurrences.upcoming.length ? (
          <section className="section-stack" aria-labelledby="upcoming-heading">
            <h2 className="section-heading" id="upcoming-heading">Coming up</h2>
            <ul className="occurrence-list">
              {occurrences.upcoming.map((occurrence) => (
                <OccurrenceCard occurrence={occurrence} today={today} showDate key={occurrence.id} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
