"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function HouseholdError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Household" variant="root">
      <ErrorState
        description="We could not load your household. Check your connection and try again."
        onRetry={reset}
      />
    </PageShell>
  );
}
