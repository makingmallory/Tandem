import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ChoreDetailsLoading() {
  return (
    <PageShell title="Chore Details" variant="detail" backHref="/chores">
      <LoadingState label="Loading chore" />
    </PageShell>
  );
}
