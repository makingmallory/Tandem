import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChoreCard } from "@/components/chore/ChoreCard";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { getChores } from "@/data/chores/queries";
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
  if (isShellTestMode()) {
    chores = choreFixtures();
  } else {
    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
    chores = await getChores(household.id);
  }
  const activeChores = chores.filter((chore) => chore.is_active);
  const pausedChores = chores.filter((chore) => !chore.is_active);

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
                {activeChores.map((chore) => <ChoreCard chore={chore} key={chore.id} />)}
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
                {pausedChores.map((chore) => <ChoreCard chore={chore} key={chore.id} />)}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
