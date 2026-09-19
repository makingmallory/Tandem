import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeHouseholdProvider, useLocalHouseholdMutation } from "@/components/providers/RealtimeHouseholdProvider";

const refresh = vi.fn();
const removeChannel = vi.fn();
const subscribe = vi.fn();
const handlers: Array<() => void> = [];
const channel = {
  on: vi.fn((_kind, _filter, handler: () => void) => {
    handlers.push(handler);
    return channel;
  }),
  subscribe,
};
const supabase = { channel: vi.fn(() => channel), removeChannel };

function LocalMutationControl() {
  const { setMutationPending } = useLocalHouseholdMutation();
  return (
    <>
      <button onClick={() => setMutationPending("local", true)}>Start local mutation</button>
      <button onClick={() => setMutationPending("local", false)}>Finish local mutation</button>
    </>
  );
}

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/data/supabase/browser", () => ({ createSupabaseBrowserClient: () => supabase }));

describe("RealtimeHouseholdProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handlers.length = 0;
    vi.clearAllMocks();
  });

  it("uses one household channel, refreshes caches, and cleans up", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const view = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeHouseholdProvider householdId="home-1"><span>Household</span></RealtimeHouseholdProvider>
      </QueryClientProvider>,
    );
    expect(supabase.channel).toHaveBeenCalledWith("household:home-1");
    expect(channel.on).toHaveBeenCalledTimes(4);
    expect(subscribe).toHaveBeenCalledOnce();

    act(() => handlers[0]!());
    await act(async () => vi.advanceTimersByTimeAsync(80));
    expect(invalidate).toHaveBeenCalledTimes(4);
    expect(refresh).toHaveBeenCalledOnce();

    view.unmount();
    expect(removeChannel).toHaveBeenCalledWith(channel);
    vi.useRealTimers();
  });

  it("does not race a local mutation, while later remote events still refresh", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const view = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeHouseholdProvider householdId="home-1"><LocalMutationControl /></RealtimeHouseholdProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(view.getByRole("button", { name: "Start local mutation" }));
    act(() => handlers[0]!());
    expect(invalidate).toHaveBeenCalledTimes(4);
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(view.getByRole("button", { name: "Finish local mutation" }));
    await act(async () => vi.advanceTimersByTimeAsync(600));
    act(() => handlers[0]!());
    await act(async () => vi.advanceTimersByTimeAsync(80));
    expect(refresh).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
