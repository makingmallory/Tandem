import { HousePlus, KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { CreateHouseholdForm } from "@/components/household/CreateHouseholdForm";
import { JoinHouseholdForm } from "@/components/household/JoinHouseholdForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?next=/setup");
  if (await getCurrentHousehold()) redirect("/");

  return (
    <PageShell title="Set up your home" variant="root">
      <div className="page-stack">
        <p className="muted-copy">
          Start a new shared household, or use the invite from your person.
        </p>
        <div className="choice-grid">
          <Card className="choice-card">
            <div className="choice-card__heading">
              <span className="choice-card__icon" style={{ "--choice-accent": "var(--color-rose)" } as React.CSSProperties}>
                <HousePlus aria-hidden="true" size={23} />
              </span>
              <div>
                <p className="eyebrow">First person</p>
                <h2 className="choice-card__title">Create your household</h2>
              </div>
            </div>
            <CreateHouseholdForm />
          </Card>

          <Card className="choice-card">
            <div className="choice-card__heading">
              <span className="choice-card__icon" style={{ "--choice-accent": "var(--color-sky)" } as React.CSSProperties}>
                <KeyRound aria-hidden="true" size={23} />
              </span>
              <div>
                <p className="eyebrow">Invited person</p>
                <h2 className="choice-card__title">Join with a code</h2>
              </div>
            </div>
            <JoinHouseholdForm />
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
