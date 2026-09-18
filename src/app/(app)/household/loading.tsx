import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function HouseholdLoading() {
  return (
    <PageShell title="Household" variant="root">
      <LoadingState label="Loading household" />
    </PageShell>
  );
}
