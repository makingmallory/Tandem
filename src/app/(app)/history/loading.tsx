import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function HistoryLoading() {
  return (
    <PageShell title="History" variant="root">
      <LoadingState label="Loading household history" variant="list" rows={4} />
    </PageShell>
  );
}
