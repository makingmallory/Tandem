import { BottomNav } from "@/components/layout/BottomNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { RealtimeHouseholdProvider } from "@/components/providers/RealtimeHouseholdProvider";

type AppFrameProps = {
  children: React.ReactNode;
  showNavigation?: boolean;
  householdId?: string | null;
};

export function AppFrame({ children, showNavigation = true, householdId = null }: Readonly<AppFrameProps>) {
  const frame = (
    <div className={`app-frame${showNavigation ? "" : " app-frame--without-nav"}`}>
      {children}
      {showNavigation ? <BottomNav /> : null}
    </div>
  );

  return (
    <QueryProvider>
      {householdId ? <RealtimeHouseholdProvider householdId={householdId}>{frame}</RealtimeHouseholdProvider> : frame}
    </QueryProvider>
  );
}
