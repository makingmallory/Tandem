"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function EditChoreError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Edit Chore" variant="detail" backHref="/chores">
      <ErrorState description="We could not load the chore editor. Check your connection and try again." onRetry={reset} />
    </PageShell>
  );
}
