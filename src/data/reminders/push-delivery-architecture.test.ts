// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("push delivery architecture", () => {
  it("removes expired subscriptions and rechecks shared occurrence state", async () => {
    const source = await readFile(path.resolve(import.meta.dirname, "../../../supabase/functions/send-reminders/index.ts"), "utf8");
    expect(source).toContain("statusCode === 404 || statusCode === 410");
    expect(source).toContain('occurrence?.status !== "scheduled"');
    expect(source).toContain("!chore?.is_active");
    expect(source).not.toMatch(/assigned|assignee|responsible/i);
  });
});
