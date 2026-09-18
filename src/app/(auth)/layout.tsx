import { AppFrame } from "@/components/layout/AppFrame";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppFrame showNavigation={false}>{children}</AppFrame>;
}
