import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ChoresLoading() {
  return (
    <PageShell title="Chores" variant="root">
      <LoadingState label="Loading chores" variant="list" rows={4} />
    </PageShell>
  );
}
