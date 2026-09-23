import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AccountSettingsLoading() {
  return (
    <PageShell title="Change Password" variant="detail" backHref="/household">
      <LoadingState label="Loading account settings" variant="form" />
    </PageShell>
  );
}
