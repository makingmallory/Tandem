"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function HouseholdError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Settings" variant="root">
      <ErrorState
        error={error}
        description="We could not load your household. Check your connection and try again."
        onRetry={reset}
      />
    </PageShell>
  );
}
