import { redirect } from "next/navigation";
import { AppFrame } from "@/components/layout/AppFrame";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { isShellTestMode } from "@/lib/test-mode";

export default async function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isShellTestMode()) {
    const user = await getCurrentUser();
    if (!user) redirect("/auth/sign-in");

    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
  }

  return <AppFrame>{children}</AppFrame>;
}
