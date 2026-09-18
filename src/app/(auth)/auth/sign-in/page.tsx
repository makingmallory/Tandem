import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { APP_BRAND } from "@/config/brand";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { safeRedirectPath } from "@/lib/validation/auth";

type SignInPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: Readonly<SignInPageProps>) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const user = await getCurrentUser();

  if (user) {
    if (nextPath) redirect(nextPath);
    redirect((await getCurrentHousehold()) ? "/" : "/setup");
  }

  return (
    <PageShell title={APP_BRAND.name} subtitle={APP_BRAND.tagline} variant="root">
      <div className="page-stack">
        <div className="auth-intro">
          <p className="eyebrow">Welcome home</p>
          <p className="auth-intro__tagline">Sign in to your shared household.</p>
        </div>
        <Card>
          <SignInForm nextPath={nextPath ?? undefined} />
        </Card>
      </div>
    </PageShell>
  );
}
