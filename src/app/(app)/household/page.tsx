import { Bell, ChevronRight, House, KeyRound } from "lucide-react";
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
      <PageShell title="Settings" variant="root">
        <div className="page-stack">
          <PhaseNotice
            title="Your shared space starts here"
            description="The shell test keeps this page data-free while checking header geometry."
            accent="mint"
          />
          <Card>
            <nav className="settings-list" aria-label="Personal settings">
              <Link className="settings-list__item" href="/settings/notifications">
                <span className="settings-list__icon"><Bell aria-hidden="true" size={20} /></span>
                <span><strong>Notifications</strong><small>Devices and test notifications</small></span>
                <ChevronRight aria-hidden="true" size={19} />
              </Link>
              <Link className="settings-list__item" href="/settings/account">
                <span className="settings-list__icon"><KeyRound aria-hidden="true" size={20} /></span>
                <span><strong>Account</strong><small>Profile and sign-in</small></span>
                <ChevronRight aria-hidden="true" size={19} />
              </Link>
            </nav>
          </Card>
        </div>
      </PageShell>
    );
  }

  const [household, user] = await Promise.all([getCurrentHousehold(), getCurrentUser()]);
  if (!household || !user) redirect("/setup");

  return (
    <PageShell title="Settings" variant="root">
      <div className="page-stack">
        <section className="section-stack">
          <div>
            <h2 className="section-heading">Household</h2>
            <p className="section-supporting-copy">Your shared home and the people in it.</p>
          </div>
          <Card className="settings-household-card">
            <div className="settings-household-card__heading">
              <span className="settings-list__icon"><House aria-hidden="true" size={21} /></span>
              <div>
                <p className="settings-household-card__name">{household.name}</p>
                <p className="muted-copy">{household.members.length} {household.members.length === 1 ? "member" : "members"}</p>
              </div>
            </div>
            {household.members.length ? (
              <div className="section-stack">
                <MemberList members={household.members} />
                {household.members.length === 1 ? (
                  <p className="muted-copy">Just you for now. Share the invite when your person is ready.</p>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No members yet" description="Share your invite to get started." />
            )}
          </Card>
        </section>

        <InviteCard inviteCode={household.invite_code} />

        <section className="section-stack" aria-labelledby="personal-settings-heading">
          <div>
            <h2 className="section-heading" id="personal-settings-heading">Your settings</h2>
            <p className="section-supporting-copy">Notifications and account preferences.</p>
          </div>
          <Card className="settings-hub-card">
            <nav className="settings-list" aria-label="Personal settings">
              <Link className="settings-list__item" href="/settings/notifications">
                <span className="settings-list__icon"><Bell aria-hidden="true" size={20} /></span>
                <span><strong>Notifications</strong><small>Devices and test notifications</small></span>
                <ChevronRight aria-hidden="true" size={19} />
              </Link>
              <Link className="settings-list__item" href="/settings/account">
                <span className="settings-list__icon"><KeyRound aria-hidden="true" size={20} /></span>
                <span><strong>Account</strong><small>{user.email}</small></span>
                <ChevronRight aria-hidden="true" size={19} />
              </Link>
            </nav>
          </Card>
          <SignOutButton />
        </section>
      </div>
    </PageShell>
  );
}
