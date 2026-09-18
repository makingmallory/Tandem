import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Accent = "rose" | "sky" | "amber" | "lavender" | "mint" | "peach";

const ACCENT_VARS: Record<Accent, string> = {
  rose: "var(--color-rose)",
  sky: "var(--color-sky)",
  amber: "var(--color-amber)",
  lavender: "var(--color-lavender)",
  mint: "var(--color-mint)",
  peach: "var(--color-peach)",
};

type PlaceholderCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: Accent;
};

export function PlaceholderCard({
  icon: Icon,
  title,
  description,
  accent = "mint",
}: Readonly<PlaceholderCardProps>) {
  return (
    <Card className="placeholder-card">
      <div className="placeholder-card__icon" style={{ "--card-accent": ACCENT_VARS[accent] } as React.CSSProperties}>
        <Icon aria-hidden="true" size={25} strokeWidth={2.1} />
      </div>
      <div>
        <h2 className="placeholder-card__title">{title}</h2>
        <p className="muted-copy">{description}</p>
      </div>
    </Card>
  );
}
