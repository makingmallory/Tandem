import { CalendarRange } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";

export default function CalendarPage() {
  return (
    <PageShell title="Calendar" variant="root">
      <div className="page-stack">
        <p className="eyebrow">A week at a glance</p>
        <PlaceholderCard
          icon={CalendarRange}
          title="Your week is taking shape"
          description="The mobile week selector and scheduled occurrences will be added with the recurrence phase."
          accent="sky"
        />
      </div>
    </PageShell>
  );
}
