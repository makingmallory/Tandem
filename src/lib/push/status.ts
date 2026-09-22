export type NotificationDeviceState = "unsupported" | "needs_install" | "prompt" | "denied" | "enabled" | "available";

export function notificationDeviceState(input: {
  serviceWorker: boolean; pushManager: boolean; permission: NotificationPermission;
  installed: boolean; isIos: boolean; subscribed: boolean;
}): NotificationDeviceState {
  if (!input.serviceWorker || !input.pushManager) return "unsupported";
  if (input.isIos && !input.installed) return "needs_install";
  if (input.permission === "denied") return "denied";
  if (input.subscribed) return "enabled";
  if (input.permission === "default") return "prompt";
  return "available";
}

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
