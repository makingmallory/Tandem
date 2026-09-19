import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { ChoreStatusForm } from "@/components/chore/ChoreStatusForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getChore } from "@/data/chores/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import type { DateOnly } from "@/domain/dates/date-only";
import { formatMonthDay } from "@/domain/formatters/dates";
import { formatRecurrence } from "@/domain/formatters/recurrence";

export default async function ChoreDetailsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, household] = await Promise.all([params, getCurrentHousehold()]);
  if (!household) redirect("/setup");
  const chore = await getChore(household.id, id);
  if (!chore) notFound();

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

        <ChoreStatusForm choreId={chore.id} isActive={chore.is_active} />
      </div>
    </PageShell>
  );
}
