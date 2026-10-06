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
    expect(source).toContain("claim.offset_value === 0");
    expect(source).toContain("is due in ${claim.offset_value}");
    expect(source).not.toMatch(/assigned|assignee|responsible/i);
  });

  it("targets only the requested subscription for authenticated test pushes while scheduled delivery stays multi-device", async () => {
    const source = await readFile(path.resolve(import.meta.dirname, "../../../supabase/functions/send-reminders/index.ts"), "utf8");
    expect(source).toContain("subscriptionEndpoint?: string");
    expect(source).toContain('query = query.eq("endpoint", subscriptionEndpoint)');
    expect(source).toContain("}, body.subscriptionEndpoint)");
    expect(source).toContain("sendToSubscriptions(claim.user_id, {");
  });
});
