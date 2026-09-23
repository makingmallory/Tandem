import { Card } from "@/components/ui/Card";

type LoadingStateProps = {
  label?: string;
  rows?: number;
  variant?: "card" | "list" | "form";
};

export function LoadingState({
  label = "Loading",
  rows = 1,
  variant = "card",
}: Readonly<LoadingStateProps>) {
  return (
    <div className={`loading-state loading-state--${variant}`} role="status" aria-label={label} aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Card className="loading-state__card" aria-hidden="true" key={index}>
          {variant === "list" ? <div className="skeleton skeleton--tile" /> : null}
          <div className="loading-state__copy">
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--line" />
            {variant !== "list" ? <div className="skeleton skeleton--line skeleton--short" /> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
