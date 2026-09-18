import { Clock3 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";

export default function HistoryPage() {
  return (
    <PageShell title="History" variant="root">
      <div className="page-stack">
        <p className="eyebrow">Little wins, remembered</p>
        <PlaceholderCard
          icon={Clock3}
          title="Shared activity will appear here"
          description="Completion history stays empty until the cloud data and activity phases are built."
          accent="lavender"
        />
      </div>
    </PageShell>
  );
}
