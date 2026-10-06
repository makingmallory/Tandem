import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTestPushAction } from "@/actions/reminders";

const getCurrentUser = vi.hoisted(() => vi.fn());
const sendPersonalTestPush = vi.hoisted(() => vi.fn());

vi.mock("@/data/auth/queries", () => ({ getCurrentUser }));
vi.mock("@/data/household/queries", () => ({ getCurrentHousehold: vi.fn() }));
vi.mock("@/data/reminders/mutations", () => ({
  registerPersonalPushSubscription: vi.fn(),
  removePersonalPushSubscription: vi.fn(),
  savePersonalReminder: vi.fn(),
  sendPersonalTestPush,
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

describe("sendTestPushAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("forwards the requested current-device endpoint and requires exactly one delivery", async () => {
    sendPersonalTestPush.mockResolvedValue({ data: { sent: 1 }, error: null });

    await expect(sendTestPushAction("https://push.example/android")).resolves.toEqual({
      ok: true,
      message: "Test notification sent.",
    });
    expect(sendPersonalTestPush).toHaveBeenCalledWith("https://push.example/android");
  });

  it("does not send an account-wide test when no current-device endpoint is supplied", async () => {
    await expect(sendTestPushAction("")).resolves.toEqual({
      ok: false,
      message: "This device does not have an active push subscription.",
    });
    expect(sendPersonalTestPush).not.toHaveBeenCalled();
  });
});
