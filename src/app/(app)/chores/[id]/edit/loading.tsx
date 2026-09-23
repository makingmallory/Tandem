import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function EditChoreLoading() {
  return (
    <PageShell title="Edit Chore" variant="detail" backHref="/chores">
      <LoadingState label="Loading chore form" variant="form" rows={2} />
    </PageShell>
  );
}
