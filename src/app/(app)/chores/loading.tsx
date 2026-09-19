import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ChoresLoading() {
  return (
    <PageShell title="Chores" variant="root">
      <div className="page-stack">
        <LoadingState label="Loading chores" />
        <LoadingState label="Loading chores" />
      </div>
    </PageShell>
  );
}
