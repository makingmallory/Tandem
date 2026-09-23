"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { APP_BRAND } from "@/config/brand";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallPromptCard() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("pwa-install-dismissed") === "1";
    } catch {
      // Storage may be unavailable in private browsing; the card can still work for this visit.
    }
    if (standalone || dismissed) return;
    const revealTimer = window.setTimeout(() => {
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setVisible(true);
    }, 0);
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const installed = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!visible) return null;
  const dismiss = () => {
    try {
      localStorage.setItem("pwa-install-dismissed", "1");
    } catch {
      // Dismiss for this visit even when device storage is unavailable.
    }
    setVisible(false);
  };
  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
  };

  return (
    <Card className="install-card">
      <span className="state-card__icon"><Download aria-hidden="true" size={22} /></span>
      <div>
        <p className="state-card__title">Add {APP_BRAND.name} to your Home Screen</p>
        <p className="state-card__copy">
          {promptEvent
            ? "Install it for quick access and phone notifications."
            : isIos
              ? "In Safari, tap Share, then Add to Home Screen."
              : "Open your browser menu and choose Install app or Add to Home Screen."}
        </p>
      </div>
      <div className="button-row">
        {promptEvent ? <button type="button" className="app-button" onClick={install}><Download aria-hidden="true" size={18} /> Install</button> : null}
        {isIos ? <span className="muted-copy"><Share size={16} aria-hidden="true" /> Use Safari’s Share button</span> : null}
        <button type="button" className="app-button app-button--tertiary" onClick={dismiss}>Not now</button>
      </div>
    </Card>
  );
}
