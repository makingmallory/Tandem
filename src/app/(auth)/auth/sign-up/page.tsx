import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { safeRedirectPath } from "@/lib/validation/auth";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: Readonly<SignUpPageProps>) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const user = await getCurrentUser();

  if (user) {
    if (nextPath) redirect(nextPath);
    redirect((await getCurrentHousehold()) ? "/" : "/setup");
  }

  return (
    <PageShell title="Create your account" variant="detail" backHref="/auth/sign-in">
      <div className="page-stack">
        <p className="muted-copy">
          Use email and password—no paid email service or social login is required.
        </p>
        <Card>
          <SignUpForm nextPath={nextPath ?? undefined} />
        </Card>
      </div>
    </PageShell>
  );
}
