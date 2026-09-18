import { describe, expect, it } from "vitest";
import { safeRedirectPath, signUpSchema } from "@/lib/validation/auth";

describe("auth validation", () => {
  it("reports each missing required signup value", () => {
    const result = signUpSchema.safeParse({
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors).toMatchObject({
      displayName: ["Enter the name you want your household to see."],
      email: ["Enter a valid email address."],
      password: ["Use at least 8 characters."],
      confirmPassword: ["Confirm your password."],
    });
  });

  it("reports an invalid email address", () => {
    const result = signUpSchema.safeParse({
      displayName: "Avery",
      email: "not-an-email",
      password: "household-one",
      confirmPassword: "household-one",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain("Enter a valid email address.");
  });

  it("reports a password under eight characters", () => {
    const result = signUpSchema.safeParse({
      displayName: "Avery",
      email: "avery@example.com",
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain("Use at least 8 characters.");
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({
      displayName: "Avery",
      email: "avery@example.com",
      password: "household-one",
      confirmPassword: "household-two",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirmPassword).toContain(
      "The passwords do not match.",
    );
  });

  it("allows only local redirect paths", () => {
    expect(safeRedirectPath("/join/ABCDEF123456")).toBe("/join/ABCDEF123456");
    expect(safeRedirectPath("https://example.com")).toBeNull();
    expect(safeRedirectPath("//example.com")).toBeNull();
  });
});
