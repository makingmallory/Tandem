"use client";

import { Bell, BellOff, Send, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  registerPushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushAction,
} from "@/actions/reminders";
import { Card } from "@/components/ui/Card";
import { notificationDeviceState, urlBase64ToUint8Array, type NotificationDeviceState } from "@/lib/push/status";

function installedMode() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function NotificationSettings({ initialDeviceCount }: Readonly<{ initialDeviceCount: number }>) {
  const [deviceState, setDeviceState] = useState<NotificationDeviceState>("unsupported");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshState = async () => {
    const serviceWorker = "serviceWorker" in navigator;
    const pushManager = "PushManager" in window;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let current: PushSubscription | null = null;
    if (serviceWorker && pushManager) {
      const registration = await navigator.serviceWorker.ready;
      current = await registration.pushManager.getSubscription();
    }
    setSubscription(current);
    setDeviceState(notificationDeviceState({
      serviceWorker,
      pushManager,
      permission: "Notification" in window ? Notification.permission : "denied",
      installed: installedMode(),
      isIos,
      subscribed: Boolean(current),
    }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshState().catch(() => {
        setDeviceState("unsupported");
        setMessage("This device could not initialize push notifications. Try reloading the app.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const enable = () => startTransition(async () => {
    setMessage(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setMessage("Notifications are not configured yet. Add the public VAPID key to the deployment.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        await refreshState();
        setMessage("Notification permission was not granted. You can change it in your browser or phone settings.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const next = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = next.toJSON();
      const result = await registerPushSubscriptionAction({
        endpoint: next.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        deviceLabel: /iphone|ipad|ipod/i.test(navigator.userAgent) ? "Apple device" : "Browser device",
        userAgent: navigator.userAgent,
      });
      if (!result.ok) {
        await next.unsubscribe();
        setMessage(result.message);
        return;
      }
      setMessage(result.message);
      await refreshState();
    } catch {
      setMessage("This device could not enable notifications. Check your connection and try again.");
    }
  });

  const disable = () => startTransition(async () => {
    if (!subscription) return;
    try {
      const result = await removePushSubscriptionAction(subscription.endpoint);
      if (result.ok) await subscription.unsubscribe();
      setMessage(result.message);
      await refreshState();
    } catch {
      setMessage("This device could not turn off notifications. Check your connection and try again.");
    }
  });

  const test = () => startTransition(async () => {
    try {
      const result = await sendTestPushAction();
      setMessage(result.message);
    } catch {
      setMessage("The test notification could not be sent. Check your connection and try again.");
    }
  });

  const copy = {
    enabled: "Notifications enabled on this device",
    denied: "Notification permission is denied",
    needs_install: "Install the app to your Home Screen before enabling notifications on this Apple device",
    prompt: "Phone notifications are ready to enable",
    available: "Permission is granted; finish enabling this device",
    unsupported: "This browser does not support Web Push",
  }[deviceState];

  return (
    <div className="page-stack">
      <Card className="notification-status-card">
        <span className="state-card__icon">{deviceState === "enabled" ? <Bell size={22} /> : <BellOff size={22} />}</span>
        <div>
          <p className="state-card__title">{copy}</p>
          <p className="state-card__copy">{initialDeviceCount} {initialDeviceCount === 1 ? "device" : "devices"} registered for your account.</p>
        </div>
      </Card>
      <Card className="section-stack">
        <div className="choice-card__heading">
          <span className="choice-card__icon"><Smartphone size={22} /></span>
          <div><p className="eyebrow">This device</p><p className="choice-card__title">Push notifications</p></div>
        </div>
        <div className="button-row">
          {deviceState === "enabled"
            ? <button className="app-button app-button--secondary" disabled={isPending} onClick={disable}>Turn off on this device</button>
            : deviceState !== "denied" && deviceState !== "needs_install" && deviceState !== "unsupported"
              ? <button className="app-button" disabled={isPending} onClick={enable}><Bell size={18} /> Enable notifications</button>
              : null}
          {deviceState === "enabled" ? <button className="app-button" disabled={isPending} onClick={test}><Send size={18} /> Send test notification</button> : null}
        </div>
        {deviceState === "denied" ? <p className="muted-copy">Open this site’s browser settings, allow Notifications, then return here.</p> : null}
        {deviceState === "needs_install" ? <p className="muted-copy">In Safari, tap Share, choose Add to Home Screen, then open the installed app.</p> : null}
        {message ? <p className="form-message" role="status">{message}</p> : null}
      </Card>
    </div>
  );
}
