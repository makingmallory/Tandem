// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("push service worker", () => {
  it("shows payload notifications and opens their same-origin target", async () => {
    const source = await readFile(path.resolve(import.meta.dirname, "../../../public/sw.js"), "utf8");
    expect(source).toContain('addEventListener("push"');
    expect(source).toContain('addEventListener("notificationclick"');
    expect(source).toContain("clients.openWindow(target.href)");
    expect(source).toContain("target.origin !== self.location.origin");
  });
});
