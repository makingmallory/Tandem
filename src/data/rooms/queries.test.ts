// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRoomContext } from "@/data/rooms/queries";
const { response } = vi.hoisted(() => ({ response: vi.fn() }));
vi.mock("@/data/supabase/server", () => ({ createSupabaseServerClient: async () => ({
  from: () => ({ select: () => ({ eq: () => ({ order: response }) }) }),
}) }));
describe("rooms during the pending migration", () => {
  beforeEach(() => vi.clearAllMocks());
  it("handles only the missing table as a pending feature", async () => {
    response.mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    expect(await getRoomContext("home")).toEqual({ available: false, rooms: [] });
  });
  it("does not hide connection or authorization errors", async () => {
    response.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(getRoomContext("home")).rejects.toThrow("We could not load your rooms");
  });
});
