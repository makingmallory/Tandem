import { describe, expect, it } from "vitest";
import { inviteCodeSchema } from "@/lib/validation/household";

describe("household validation", () => {
  it("normalizes a valid invite code", () => {
    expect(inviteCodeSchema.parse({ inviteCode: "abcdef123456" }).inviteCode).toBe(
      "ABCDEF123456",
    );
  });

  it("rejects malformed invite codes", () => {
    expect(inviteCodeSchema.safeParse({ inviteCode: "not-a-code" }).success).toBe(false);
  });
});
