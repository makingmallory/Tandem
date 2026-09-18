import { Card } from "@/components/ui/Card";

export function LoadingState({ label = "Loading" }: Readonly<{ label?: string }>) {
  return (
    <Card className="state-card" aria-label={label}>
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line" />
    </Card>
  );
}
