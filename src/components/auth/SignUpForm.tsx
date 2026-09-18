"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

export function SignUpForm({ nextPath }: Readonly<{ nextPath?: string }>) {
  const [state, formAction] = useActionState(signUpAction, INITIAL_ACTION_STATE);
  const signInHref = nextPath ? `/auth/sign-in?next=${encodeURIComponent(nextPath)}` : "/auth/sign-in";

  return (
    <form action={formAction} className="form-stack">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <TextField
        id="displayName"
        name="displayName"
        label="Your name"
        autoComplete="name"
        required
        error={state.fieldErrors?.displayName?.[0]}
      />
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email?.[0]}
      />
      <TextField
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="Use at least 8 characters."
        error={state.fieldErrors?.password?.[0]}
      />
      <TextField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>
      <p className="muted-copy">
        Already have an account?{" "}
        <Link className="inline-link" href={signInHref}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
