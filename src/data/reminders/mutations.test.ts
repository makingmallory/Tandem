import { describe, expect, it, vi } from "vitest";
import { sendPersonalTestPush } from "@/data/reminders/mutations";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/data/supabase/server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({ functions: { invoke } }),
}));

describe("sendPersonalTestPush", () => {
  it("passes only the current subscription endpoint to the authenticated test request", async () => {
    invoke.mockResolvedValue({ data: { sent: 1 }, error: null });

    await sendPersonalTestPush("https://push.example/android");

    expect(invoke).toHaveBeenCalledWith("send-reminders", {
      body: { mode: "test", subscriptionEndpoint: "https://push.example/android" },
    });
  });
});
