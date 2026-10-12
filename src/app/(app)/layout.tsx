import { redirect } from "next/navigation";
import { AppFrame } from "@/components/layout/AppFrame";
import { getCurrentUser } from "@/data/auth/queries";
import { getCurrentHousehold } from "@/data/household/queries";
import { isShellTestMode } from "@/lib/test-mode";
import { getRoomContext } from "@/data/rooms/queries";
import { getCategoryFeaturesAvailable } from "@/data/routines/capabilities";

export default async function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let householdId: string | null = null;
  let phase8Available = false;
  let categoryFeaturesAvailable = false;
  if (!isShellTestMode()) {
    const user = await getCurrentUser();
    if (!user) redirect("/auth/sign-in");

    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
    householdId = household.id;
    phase8Available = (await getRoomContext(household.id)).available;
    categoryFeaturesAvailable = await getCategoryFeaturesAvailable(household.id);
  }

  return <AppFrame householdId={householdId} phase8Available={phase8Available} categoryFeaturesAvailable={categoryFeaturesAvailable}>{children}</AppFrame>;
}
