import { describe, expect, it, vi } from "vitest";
import { INITIAL_ACTION_STATE } from "@/actions/state";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOutCurrentUser: vi.fn(),
  signUpWithPassword: vi.fn(),
  updateCurrentUserPassword: vi.fn(),
}));

vi.mock("@/data/auth/mutations", () => mocks);
vi.mock("@/data/household/queries", () => ({ getCurrentHousehold: vi.fn() }));

import { signUpAction } from "@/actions/auth";

function signUpFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("signUpAction", () => {
  it("returns field errors for missing required values", async () => {
    const state = await signUpAction(INITIAL_ACTION_STATE, signUpFormData({}));

    expect(state.status).toBe("error");
    expect(state.fieldErrors).toMatchObject({
      displayName: ["Enter the name you want your household to see."],
      email: ["Enter a valid email address."],
      password: ["Use at least 8 characters."],
      confirmPassword: ["Confirm your password."],
    });
    expect(state.formError).toBeUndefined();
  });

  it("returns field errors for an invalid email", async () => {
    const state = await signUpAction(
      INITIAL_ACTION_STATE,
      signUpFormData({
        displayName: "Avery",
        email: "wrong",
        password: "household-one",
        confirmPassword: "household-one",
      }),
    );

    expect(state.fieldErrors?.email).toContain("Enter a valid email address.");
  });

  it("returns a field error for a short password", async () => {
    const state = await signUpAction(
      INITIAL_ACTION_STATE,
      signUpFormData({
        displayName: "Avery",
        email: "avery@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    );

    expect(state.fieldErrors?.password).toContain("Use at least 8 characters.");
  });

  it("places a password mismatch beneath confirm password", async () => {
    const state = await signUpAction(
      INITIAL_ACTION_STATE,
      signUpFormData({
        displayName: "Avery",
        email: "avery@example.com",
        password: "household-one",
        confirmPassword: "household-two",
      }),
    );

    expect(state.fieldErrors?.confirmPassword).toContain("The passwords do not match.");
    expect(state.fieldErrors?.password).toBeUndefined();
  });

  it("returns a Supabase signup failure as a form-level error", async () => {
    mocks.signUpWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { code: "email_exists" },
    });

    const state = await signUpAction(
      INITIAL_ACTION_STATE,
      signUpFormData({
        displayName: "Avery",
        email: "avery@example.com",
        password: "household-one",
        confirmPassword: "household-one",
      }),
    );

    expect(state).toEqual({
      status: "error",
      formError: "An account already uses that email address.",
    });
    expect(state.fieldErrors).toBeUndefined();
  });
});
