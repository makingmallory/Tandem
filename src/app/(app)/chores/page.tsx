import { ListChecks } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";

export default function ChoresPage() {
  return (
    <PageShell title="Chores" variant="root">
      <div className="page-stack">
        <p className="eyebrow">Shared routines</p>
        <PlaceholderCard
          icon={ListChecks}
          title="A home for every routine"
          description="Recurring chore definitions and their filters belong to Phase 2."
          accent="amber"
        />
      </div>
    </PageShell>
  );
}
