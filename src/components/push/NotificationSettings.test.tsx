import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSettings } from "@/components/push/NotificationSettings";

const sendTestPushAction = vi.hoisted(() => vi.fn());

vi.mock("@/actions/reminders", () => ({
  registerPushSubscriptionAction: vi.fn(),
  removePushSubscriptionAction: vi.fn(),
  sendTestPushAction,
}));

describe("NotificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "PushManager", { configurable: true, value: class PushManager {} });
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "granted" } });
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({ endpoint: "https://push.example/android" }),
          },
        }),
      },
    });
  });

  it("sends a test only to the current browser subscription", async () => {
    sendTestPushAction.mockResolvedValue({ ok: true, message: "Test notification sent." });
    render(<NotificationSettings initialDeviceCount={2} />);

    const button = await screen.findByRole("button", { name: "Send test notification" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(sendTestPushAction).toHaveBeenCalledWith("https://push.example/android");
    });
  });
});
