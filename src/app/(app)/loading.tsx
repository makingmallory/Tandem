import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ApplicationLoading() {
  return (
    <PageShell title="Today at Home" subtitle="Loading today’s date…" variant="root">
      <LoadingState label="Loading your household" variant="list" rows={3} />
    </PageShell>
  );
}
