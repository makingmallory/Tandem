import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function NotificationSettingsLoading() {
  return (
    <PageShell title="Notification Settings" variant="detail" backHref="/household">
      <LoadingState label="Loading notification settings" rows={2} />
    </PageShell>
  );
}
