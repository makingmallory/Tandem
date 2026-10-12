import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChoreCard } from "@/components/chore/ChoreCard";
import { RoutineGroup } from "@/components/chore/RoutineGroup";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { getRoomContext } from "@/data/rooms/queries";
import { getHouseholdRoutineKinds, getHouseholdVariants } from "@/data/routines/queries";
import { getChores } from "@/data/chores/queries";
import { groupChores, isActiveEntry, type ChoreListEntry } from "@/data/chores/grouping";
import { choreFixtures } from "@/data/chores/test-fixtures";
import { getCurrentHousehold } from "@/data/household/queries";
import { isShellTestMode } from "@/lib/test-mode";

const addAction = (
  <Link className="icon-button" href="/chores/new" aria-label="Add a chore">
    <Plus aria-hidden="true" size={22} />
  </Link>
);

export default async function ChoresPage() {
  let chores;
  let roomNames = new Map<string, string>();
  let variantNames = new Map<string, string>();
  let routineKinds = new Map<string, "chore" | "category">();
  if (isShellTestMode()) {
    chores = choreFixtures();
  } else {
    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
    const [loadedChores, { rooms }, variants, loadedRoutineKinds] = await Promise.all([getChores(household.id), getRoomContext(household.id), getHouseholdVariants(household.id), getHouseholdRoutineKinds(household.id)]);
    chores = loadedChores;
    roomNames = new Map(rooms.map((room) => [room.id, room.name]));
    variantNames = new Map(variants.map((variant) => [variant.id, variant.name]));
    routineKinds = loadedRoutineKinds;
  }
  const entries = groupChores(chores, routineKinds);
  const activeChores = entries.filter(isActiveEntry);
  const pausedChores = entries.filter((entry) => !isActiveEntry(entry));
  const labels = { roomNames, variantNames };
  const renderEntry = (entry: ChoreListEntry) => entry.kind === "group"
    ? <RoutineGroup key={entry.targets[0]!.routine_id} targets={entry.targets} labels={labels} />
    : <ChoreCard key={entry.chore.id} roomName={entry.chore.room_id ? roomNames.get(entry.chore.room_id) : undefined} variantName={entry.chore.variant_id ? variantNames.get(entry.chore.variant_id) : undefined} chore={entry.chore} />;

  return (
    <PageShell title="Chores" variant="root" actions={addAction}>
      {chores.length === 0 ? (
        <EmptyState
          title="Your shared routines start here"
          description="Add the first recurring chore and everyone in your household will be able to see and manage it."
          action={<Link className="app-button" href="/chores/new">Add your first chore</Link>}
        />
      ) : (
        <div className="page-stack">
          <section className="section-stack" aria-labelledby="active-chores-heading">
            <div>
              <h2 className="section-heading" id="active-chores-heading">Active chores</h2>
              <p className="section-supporting-copy">The rhythms keeping your home moving.</p>
            </div>
            {activeChores.length ? (
              <ul className="chore-list">
                {activeChores.map(renderEntry)}
              </ul>
            ) : (
              <p className="muted-copy">Everything is paused for now.</p>
            )}
          </section>

          {pausedChores.length ? (
            <section className="section-stack" aria-labelledby="paused-chores-heading">
              <div>
                <h2 className="section-heading" id="paused-chores-heading">Paused</h2>
                <p className="section-supporting-copy">Saved routines that are resting for now.</p>
              </div>
              <ul className="chore-list">
                {pausedChores.map(renderEntry)}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
