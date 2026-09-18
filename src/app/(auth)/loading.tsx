import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AuthLoading() {
  return (
    <PageShell title="Welcome home" variant="root">
      <LoadingState label="Loading sign in" />
    </PageShell>
  );
}
