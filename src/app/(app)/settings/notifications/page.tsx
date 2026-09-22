import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { NotificationSettings } from "@/components/push/NotificationSettings";
import { getCurrentUser } from "@/data/auth/queries";
import { getPersonalPushSubscriptions } from "@/data/reminders/queries";
import { isShellTestMode } from "@/lib/test-mode";

export default async function NotificationSettingsPage() {
  if (isShellTestMode()) {
    return (
      <PageShell title="Notification Settings" variant="detail" backHref="/household">
        <NotificationSettings initialDeviceCount={0} />
      </PageShell>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const subscriptions = await getPersonalPushSubscriptions(user.id);
  return (
    <PageShell title="Notification Settings" variant="detail" backHref="/household">
      <NotificationSettings initialDeviceCount={subscriptions.length} />
    </PageShell>
  );
}
