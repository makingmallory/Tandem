import { notFound, redirect } from "next/navigation";
import { updateChoreAction } from "@/actions/chores";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { getRoomContext } from "@/data/rooms/queries";
import { getRoutineDetails } from "@/data/routines/queries";
import { scheduleValues, targetKey } from "@/lib/validation/chore-plan";
import { getCategoryFeaturesAvailable } from "@/data/routines/capabilities";
import { PageShell } from "@/components/layout/PageShell";
import { getChore } from "@/data/chores/queries";
import { getCurrentHousehold } from "@/data/household/queries";

export default async function EditChorePage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, household] = await Promise.all([params, getCurrentHousehold()]);
  if (!household) redirect("/setup");
  const [chore, roomContext] = await Promise.all([getChore(household.id, id), getRoomContext(household.id)]);
  if (!chore || chore.retired_at) notFound();
  const routine = chore.routine_id ? await getRoutineDetails(household.id, chore.routine_id) : null;
  const targets = routine?.targets ?? [chore];
  const kind = routine ? routine.routine.kind ?? "category" : "chore";
  const initialTargets = targets.map((target) => ({ roomId: target.room_id ?? null, variantKey: target.variant_id ?? null }));

  return (
    <PageShell title={kind === "category" ? "Edit Category" : "Edit Chore"} variant="detail" backHref={`/chores/${chore.id}`}>
      <ChoreForm
        action={updateChoreAction.bind(null, chore.id)}
        mode="edit"
        kind={kind}
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
        rooms={roomContext.rooms}
        available={roomContext.available}
        featuresAvailable={routine?.featuresAvailable ?? await getCategoryFeaturesAvailable(household.id)}
        initialRoomIds={[...new Set(targets.flatMap((target) => target.room_id ? [target.room_id] : []))]}
        initialVariants={routine?.variants.map((variant) => ({ id: variant.id, key: variant.id, name: variant.name })) ?? []}
        initialTargets={initialTargets}
        initialSubtasks={routine?.subtasks.map((task) => ({ ...task, excludedTargets: routine.exclusions
          .filter((exclusion) => exclusion.subtask_id === task.id).flatMap((exclusion) => {
            const index = targets.findIndex((target) => target.id === exclusion.chore_id);
            return index >= 0 ? [targetKey(initialTargets[index]!)] : [];
          }) })) ?? []}
        initialSchedules={Object.fromEntries(targets.map((target, index) => [targetKey(initialTargets[index]!), scheduleValues(target)]))}
      />
    </PageShell>
  );
}
