import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { ChoreStatusForm } from "@/components/chore/ChoreStatusForm";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getChore } from "@/data/chores/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { getChoreOccurrenceSummary } from "@/data/occurrences/queries";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { todayDateOnly, type DateOnly } from "@/domain/dates/date-only";
import { formatMonthDay, formatTime } from "@/domain/formatters/dates";
import { formatRecurrence } from "@/domain/formatters/recurrence";

export default async function ChoreDetailsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, household] = await Promise.all([params, getCurrentHousehold()]);
  if (!household) redirect("/setup");
  const [chore, occurrenceSummary] = await Promise.all([
    getChore(household.id, id),
    getChoreOccurrenceSummary(household.id, id),
  ]);
  if (!chore) notFound();
  const today = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);

  const recurrence = formatRecurrence({
    recurrenceType: chore.recurrence_type,
    intervalCount: chore.interval_count,
    weekdays: chore.weekdays,
    dayOfMonth: chore.day_of_month,
  });

  return (
    <PageShell
      title="Chore Details"
      variant="detail"
      backHref="/chores"
      actions={
        <Link className="icon-button" href={`/chores/${chore.id}/edit`} aria-label={`Edit ${chore.name}`}>
          <Pencil aria-hidden="true" size={19} />
        </Link>
      }
    >
      <div className="page-stack">
        <Card className="chore-hero" tinted>
          <ChoreIcon iconKey={chore.icon_key} accentKey={chore.accent_key} size="large" />
          <div className="chore-hero__copy">
            <Pill tone={chore.is_active ? "active" : "paused"}>{chore.is_active ? "Active" : "Paused"}</Pill>
            <h2>{chore.name}</h2>
            <p>{recurrence}</p>
          </div>
        </Card>

        <Card className="definition-card">
          <div>
            <p className="eyebrow">Schedule</p>
            <p className="definition-card__value">{recurrence}</p>
            <p className="muted-copy">Starts {formatMonthDay(chore.anchor_date as DateOnly)}</p>
          </div>
          <div>
            <p className="eyebrow">Notes</p>
            <p className={chore.description ? "definition-card__value" : "muted-copy"}>
              {chore.description || "No notes added."}
            </p>
          </div>
        </Card>

        {occurrenceSummary.actionable ? (
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
          </Card>
        ) : null}

        <ChoreStatusForm choreId={chore.id} isActive={chore.is_active} />
      </div>
    </PageShell>
  );
}
