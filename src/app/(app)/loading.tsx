import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ApplicationLoading() {
  return (
    <PageShell title="Loading your home" variant="root">
      <LoadingState label="Loading your household" />
    </PageShell>
  );
}
