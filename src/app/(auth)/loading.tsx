import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { APP_BRAND } from "@/config/brand";

export default function AuthLoading() {
  return (
    <PageShell title={APP_BRAND.name} subtitle={APP_BRAND.tagline} variant="root">
      <LoadingState label="Loading sign in" variant="form" />
    </PageShell>
  );
}
