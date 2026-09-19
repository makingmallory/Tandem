import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ChoreNotFound() {
  return (
    <PageShell title="Chore Details" variant="detail" backHref="/chores">
      <EmptyState
        title="That chore is not here"
        description="It may belong to another household or no longer be available."
        action={<Link className="app-button app-button--secondary" href="/chores">Back to chores</Link>}
      />
    </PageShell>
  );
}
