import { AppFrame } from "@/components/layout/AppFrame";

export default function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame showNavigation={false}>{children}</AppFrame>;
}
