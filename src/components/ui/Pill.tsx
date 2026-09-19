export function Pill({
  children,
  tone = "neutral",
}: Readonly<{ children: React.ReactNode; tone?: "neutral" | "active" | "paused" | "overdue" }>) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
