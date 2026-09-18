import { redirect } from "next/navigation";
import { JoinHouseholdForm } from "@/components/household/JoinHouseholdForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { inviteCodeFromPath } from "@/lib/validation/household";

type JoinPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function JoinPage({ params }: Readonly<JoinPageProps>) {
  const { inviteCode: rawCode } = await params;
  const inviteCode = inviteCodeFromPath(rawCode);
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }
  if (await getCurrentHousehold()) redirect("/household");

  return (
    <PageShell title="Join a Household" variant="detail" backHref="/setup">
      <div className="page-stack">
        <p className="muted-copy">
          You&apos;re signed in. Confirm the invite code to join the shared home.
        </p>
        <Card>
          <JoinHouseholdForm initialCode={inviteCode} />
        </Card>
      </div>
    </PageShell>
  );
}
