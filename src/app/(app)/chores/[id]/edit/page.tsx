import { notFound, redirect } from "next/navigation";
import { updateChoreAction } from "@/actions/chores";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { PageShell } from "@/components/layout/PageShell";
import { getChore } from "@/data/chores/queries";
import { getCurrentHousehold } from "@/data/household/queries";

export default async function EditChorePage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, household] = await Promise.all([params, getCurrentHousehold()]);
  if (!household) redirect("/setup");
  const chore = await getChore(household.id, id);
  if (!chore) notFound();

  return (
    <PageShell title="Edit Chore" variant="detail" backHref={`/chores/${chore.id}`}>
      <ChoreForm
        action={updateChoreAction.bind(null, chore.id)}
        mode="edit"
        initialValues={{
          name: chore.name,
          description: chore.description ?? "",
          iconKey: chore.icon_key,
          accentKey: chore.accent_key,
          recurrenceType: chore.recurrence_type,
          intervalCount: chore.interval_count,
          anchorDate: chore.anchor_date,
          weekdays: chore.weekdays ?? [],
          dayOfMonth: chore.day_of_month ?? 1,
        }}
      />
    </PageShell>
  );
}
