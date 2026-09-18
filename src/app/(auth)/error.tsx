"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AuthError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <PageShell title="Sign in" variant="root">
      <ErrorState
        description="We could not reach the sign-in service. Check your connection and Supabase environment values, then try again."
        onRetry={reset}
      />
    </PageShell>
  );
}
