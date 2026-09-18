"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

export function SignInForm({ nextPath }: Readonly<{ nextPath?: string }>) {
  const [state, formAction] = useActionState(signInAction, INITIAL_ACTION_STATE);
  const signUpHref = nextPath ? `/auth/sign-up?next=${encodeURIComponent(nextPath)}` : "/auth/sign-up";

  return (
    <form action={formAction} className="form-stack">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password?.[0]}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="muted-copy">
        New here?{" "}
        <Link className="inline-link" href={signUpHref}>
          Create an account
        </Link>
      </p>
    </form>
  );
}
