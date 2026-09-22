import { describe, expect, it } from "vitest";
import { notificationDeviceState } from "@/lib/push/status";

const base = { serviceWorker: true, pushManager: true, permission: "default" as NotificationPermission, installed: true, isIos: false, subscribed: false };

describe("notification permission states", () => {
  it("distinguishes unsupported, install-required, denied, prompt, and enabled states", () => {
    expect(notificationDeviceState({ ...base, serviceWorker: false })).toBe("unsupported");
    expect(notificationDeviceState({ ...base, isIos: true, installed: false })).toBe("needs_install");
    expect(notificationDeviceState({ ...base, permission: "denied" })).toBe("denied");
    expect(notificationDeviceState(base)).toBe("prompt");
    expect(notificationDeviceState({ ...base, permission: "granted", subscribed: true })).toBe("enabled");
  });
});
