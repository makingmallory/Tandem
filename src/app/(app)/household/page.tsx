import { Bell, KeyRound, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { InviteCard } from "@/components/household/InviteCard";
import { MemberList } from "@/components/household/MemberList";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhaseNotice } from "@/components/ui/PhaseNotice";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { isShellTestMode } from "@/lib/test-mode";

export default async function HouseholdPage() {
  if (isShellTestMode()) {
    return (
      <PageShell title="Household" variant="root">
        <PhaseNotice
          title="Your shared space starts here"
          description="The shell test keeps this page data-free while checking header geometry."
          accent="mint"
        />
      </PageShell>
    );
  }

  const [household, user] = await Promise.all([getCurrentHousehold(), getCurrentUser()]);
  if (!household || !user) redirect("/setup");

  return (
    <PageShell title="Household" variant="root">
      <div className="page-stack">
        <section className="section-stack">
          <div>
            <p className="eyebrow">Your shared home</p>
            <h2 className="section-heading">{household.name}</h2>
          </div>
          <Card>
            {household.members.length ? (
              <MemberList members={household.members} />
            ) : (
              <EmptyState title="No members yet" description="Share your invite to get started." />
            )}
          </Card>
        </section>

        <InviteCard inviteCode={household.invite_code} />

        <Card className="section-stack">
          <div className="choice-card__heading">
            <span className="choice-card__icon"><Bell aria-hidden="true" size={22} /></span>
            <div><p className="eyebrow">Notifications</p><p className="choice-card__title">Personal reminder settings</p></div>
          </div>
          <Link className="app-button app-button--secondary" href="/settings/notifications">Open notification settings</Link>
        </Card>

        <Card className="section-stack">
          <div className="choice-card__heading">
            <span className="choice-card__icon">
              <UserRound aria-hidden="true" size={22} />
            </span>
            <div>
              <p className="eyebrow">Your account</p>
              <p className="choice-card__title">{user.email}</p>
            </div>
          </div>
          <div className="button-row">
            <Link className="app-button app-button--secondary" href="/settings/account">
              <KeyRound aria-hidden="true" size={18} /> Change password
            </Link>
            <SignOutButton />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
