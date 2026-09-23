import { PageShell } from "@/components/layout/PageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { APP_BRAND } from "@/config/brand";

export default function ApplicationLoading() {
  return (
    <PageShell title={APP_BRAND.name} subtitle={APP_BRAND.tagline} variant="root">
      <LoadingState label="Loading your household" variant="list" rows={3} />
    </PageShell>
  );
}
