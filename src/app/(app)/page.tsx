import { Settings2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { PhaseNotice } from "@/components/ui/PhaseNotice";
import { APP_BRAND } from "@/config/brand";

export default function HomePage() {
  return (
    <PageShell
      title={APP_BRAND.name}
      subtitle={APP_BRAND.tagline}
      variant="root"
      actions={
        <IconButton href="/household" label="Open household settings">
          <Settings2 aria-hidden="true" size={21} strokeWidth={2.2} />
        </IconButton>
      }
    >
      <div className="page-stack">
        <Card className="progress-card">
          <div className="progress-card__topline">
            <div>
              <p className="eyebrow">Today at home</p>
              <p className="progress-card__value">2 of 5</p>
            </div>
            <p className="muted-copy">A cozy preview</p>
          </div>
          <div className="progress-track" aria-label="Sample progress: 2 of 5" />
        </Card>

        <section className="section-stack">
          <h2 className="section-heading">Today&apos;s chores</h2>
          <PhaseNotice
            title="Your shared day will live here"
            description="Chores and live household progress arrive in later blueprint phases."
            accent="rose"
          />
        </section>
      </div>
    </PageShell>
  );
}
