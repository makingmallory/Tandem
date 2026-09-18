import { BottomNav } from "@/components/layout/BottomNav";
import { QueryProvider } from "@/components/providers/QueryProvider";

type AppFrameProps = {
  children: React.ReactNode;
  showNavigation?: boolean;
};

export function AppFrame({ children, showNavigation = true }: Readonly<AppFrameProps>) {
  return (
    <QueryProvider>
      <div className={`app-frame${showNavigation ? "" : " app-frame--without-nav"}`}>
        {children}
        {showNavigation ? <BottomNav /> : null}
      </div>
    </QueryProvider>
  );
}
