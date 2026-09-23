"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const register = async () => {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await registration.update();
    };
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") void registration?.update();
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => {
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);
  return null;
}
