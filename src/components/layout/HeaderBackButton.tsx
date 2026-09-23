"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function HeaderBackButton({ fallbackHref }: Readonly<{ fallbackHref: string }>) {
  const pathname = usePathname();
  const router = useRouter();

  function goBack() {
    const previousPath = window.sessionStorage.getItem("tandem-previous-path");
    if (previousPath && previousPath !== pathname && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button className="icon-button" type="button" onClick={goBack} aria-label="Go back">
      <ArrowLeft aria-hidden="true" size={21} strokeWidth={2.25} />
    </button>
  );
}
