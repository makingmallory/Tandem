"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ChoreDetailsError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Chore Details" variant="detail" backHref="/chores">
      <ErrorState error={error} description="We could not load this chore. Check your connection and try again." onRetry={reset} />
    </PageShell>
  );
}
