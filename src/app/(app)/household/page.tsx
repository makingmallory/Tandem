import { Bell, ChevronRight, KeyRound } from "lucide-react";
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
                <Bell aria-hidden="true" size={20} />
                <span><strong>Notifications</strong><small>Devices and test notifications</small></span>
                <ChevronRight aria-hidden="true" size={19} />
              </Link>
              <Link className="settings-list__item" href="/settings/account">
                <KeyRound aria-hidden="true" size={20} />
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
            <p className="eyebrow">Household</p>
            <h2 className="section-heading">{household.name}</h2>
          </div>
          <Card>
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
            <p className="eyebrow">Personal</p>
            <h2 className="section-heading" id="personal-settings-heading">Your settings</h2>
          </div>
          <Card>
            <nav className="settings-list" aria-label="Personal settings">
              <Link className="settings-list__item" href="/settings/notifications">
                <Bell aria-hidden="true" size={20} />
                <span><strong>Notifications</strong><small>Devices and test notifications</small></span>
                <ChevronRight aria-hidden="true" size={19} />
              </Link>
              <Link className="settings-list__item" href="/settings/account">
                <KeyRound aria-hidden="true" size={20} />
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
