import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function CalendarLoading() {
  return (
    <PageShell title="Calendar" variant="root">
      <div className="page-stack">
        <LoadingState label="Loading week" />
        <LoadingState label="Loading scheduled chores" variant="list" rows={2} />
      </div>
    </PageShell>
  );
}
