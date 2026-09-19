"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function CalendarError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Calendar" variant="root">
      <ErrorState description="We could not load this week. Check your connection and try again." onRetry={reset} />
    </PageShell>
  );
}

