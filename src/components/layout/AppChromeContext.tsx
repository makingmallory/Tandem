"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";

const AppChromeContext = createContext({ authenticated: false });

export function AppChromeProvider({
  authenticated,
  children,
}: Readonly<{ authenticated: boolean; children: React.ReactNode }>) {
  const pathname = usePathname();

  useEffect(() => {
    const current = window.sessionStorage.getItem("tandem-current-path");
    if (current && current !== pathname) window.sessionStorage.setItem("tandem-previous-path", current);
    window.sessionStorage.setItem("tandem-current-path", pathname);
  }, [pathname]);

  return <AppChromeContext value={{ authenticated }}>{children}</AppChromeContext>;
}

export function useAppChrome() {
  return useContext(AppChromeContext);
}
