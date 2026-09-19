"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ApplicationError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Our home" variant="root">
      <ErrorState description="We could not load your shared schedule. Check your connection and try again." onRetry={reset} />
    </PageShell>
  );
}
