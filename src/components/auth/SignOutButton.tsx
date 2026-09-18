import { signOutAction } from "@/actions/auth";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="secondary" pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
