import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function OnboardingLoading() {
  return (
    <PageShell title="Setting up your home" variant="root">
      <LoadingState label="Loading household setup" />
    </PageShell>
  );
}
