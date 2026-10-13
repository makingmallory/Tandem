// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

async function notificationClick(url: unknown, clients: Array<{ url: string; focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> }>) {
  const source = await readFile(path.resolve(import.meta.dirname, "../../../public/sw.js"), "utf8");
  const listeners = new Map<string, (event: { notification: { close: () => void; data?: { url?: unknown } }; waitUntil: (promise: Promise<unknown>) => void }) => void>();
  const openWindow = vi.fn();
  const serviceWorker = {
    addEventListener: (name: string, listener: (event: never) => void) => listeners.set(name, listener as never),
    skipWaiting: vi.fn(), location: { origin: "https://tandem.example" }, registration: { showNotification: vi.fn() },
    clients: { claim: vi.fn(), matchAll: vi.fn().mockResolvedValue(clients), openWindow },
  };
  const previousSelf = globalThis.self;
  Object.assign(globalThis, { self: serviceWorker, caches: { open: vi.fn(), keys: vi.fn() }, fetch: vi.fn() });
  try {
    new Function(source)();
    let pending: Promise<unknown> | undefined;
    listeners.get("notificationclick")!({ notification: { close: vi.fn(), data: { url } }, waitUntil: (promise) => { pending = promise; } });
    await pending;
    return { openWindow, serviceWorker };
  } finally {
    Object.assign(globalThis, { self: previousSelf });
  }
}

describe("push service worker", () => {
  it("shows payload notifications and keeps authenticated fetches network-only", async () => {
    const source = await readFile(path.resolve(import.meta.dirname, "../../../public/sw.js"), "utf8");
    expect(source).toContain('addEventListener("push"');
    expect(source).toContain('event.request.mode !== "navigate"');
    expect(source).not.toContain("cache.put(event.request");
  });

  it("focuses and routes an existing same-origin Tandem client", async () => {
    const client = { url: "https://tandem.example/calendar", focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockResolvedValue(undefined) };
    const { openWindow } = await notificationClick("/chores/chore-1", [client]);
    expect(client.focus).toHaveBeenCalledOnce();
    expect(client.navigate).toHaveBeenCalledWith("https://tandem.example/chores/chore-1");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("opens a new same-origin client when none exist", async () => {
    const { openWindow } = await notificationClick("/chores/chore-1", []);
    expect(openWindow).toHaveBeenCalledWith("https://tandem.example/chores/chore-1");
  });

  it.each(["https://outside.example/phish", "::::", undefined])("falls back safely for invalid notification URL %p", async (url) => {
    const { openWindow } = await notificationClick(url, []);
    expect(openWindow).toHaveBeenCalledWith("https://tandem.example/");
  });
});
