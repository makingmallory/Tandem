"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ChoresError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Chores" variant="root">
      <ErrorState error={error} description="We could not load your chores. Check your connection and try again." onRetry={reset} />
    </PageShell>
  );
}
