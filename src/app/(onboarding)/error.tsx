"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function OnboardingError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Set up your home" variant="root">
      <ErrorState error={error} onRetry={reset} />
    </PageShell>
  );
}
