"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame app-frame--without-nav">
          <PageShell title="Let’s try that again" variant="root">
            <ErrorState
              description="The app could not reach a required service. Check your connection and configuration, then try again."
              onRetry={reset}
            />
          </PageShell>
        </div>
      </body>
    </html>
  );
}
