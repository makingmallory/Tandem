import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/data/auth/queries";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <PageShell title="Change Password" variant="detail" backHref="/household">
      <div className="page-stack">
        <p className="muted-copy">
          Update the password for {user.email}. Password recovery email is intentionally not required
          for this private v1 setup.
        </p>
        <Card>
          <ChangePasswordForm />
        </Card>
      </div>
    </PageShell>
  );
}
