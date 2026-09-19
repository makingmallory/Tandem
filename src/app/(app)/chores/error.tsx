"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ChoresError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Chores" variant="root">
      <ErrorState description="We could not load your chores. Check your connection and try again." onRetry={reset} />
    </PageShell>
  );
}
