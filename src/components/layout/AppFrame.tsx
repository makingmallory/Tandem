import { BottomNav } from "@/components/layout/BottomNav";
import { AppChromeProvider } from "@/components/layout/AppChromeContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { RealtimeHouseholdProvider } from "@/components/providers/RealtimeHouseholdProvider";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";

type AppFrameProps = {
  children: React.ReactNode;
  showNavigation?: boolean;
  householdId?: string | null;
  phase8Available?: boolean;
  categoryFeaturesAvailable?: boolean;
};

export function AppFrame({ children, showNavigation = true, householdId = null, phase8Available = false, categoryFeaturesAvailable = false }: Readonly<AppFrameProps>) {
  const frame = (
    <AppChromeProvider authenticated={showNavigation}>
      <div className={`app-frame${showNavigation ? "" : " app-frame--without-nav"}`}>
        {children}
        {showNavigation ? <BottomNav /> : null}
      </div>
    </AppChromeProvider>
  );

  return (
    <QueryProvider>
      <ServiceWorkerRegistrar />
      {householdId ? <RealtimeHouseholdProvider householdId={householdId} phase8Available={phase8Available} categoryFeaturesAvailable={categoryFeaturesAvailable}>{frame}</RealtimeHouseholdProvider> : frame}
    </QueryProvider>
  );
}
