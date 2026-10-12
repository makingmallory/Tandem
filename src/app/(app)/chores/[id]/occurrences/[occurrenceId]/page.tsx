import { notFound, redirect } from "next/navigation";
import { getCurrentHousehold } from "@/data/household/queries";
import { getOccurrence } from "@/data/occurrences/queries";
import { PageShell } from "@/components/layout/PageShell";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { todayDateOnly } from "@/domain/dates/date-only";

export default async function OccurrenceDetails({ params }: Readonly<{ params: Promise<{ id: string; occurrenceId: string }> }>) {
  const [{ id, occurrenceId }, home] = await Promise.all([params, getCurrentHousehold()]);
  if (!home) redirect("/setup");
  const occurrence = await getOccurrence(home.id, id, occurrenceId);
  if (!occurrence) notFound();
  return <PageShell title="Occurrence Details" variant="detail" backHref="/history">
    <ul className="occurrence-list"><OccurrenceCard occurrence={occurrence} today={todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE)} showDate /></ul>
  </PageShell>;
}
