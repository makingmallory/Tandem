"use client";

import { useFormStatus } from "react-dom";
import { AppButton } from "@/components/ui/AppButton";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "tertiary";
};

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
}: Readonly<SubmitButtonProps>) {
  const { pending } = useFormStatus();

  return (
    <AppButton type="submit" variant={variant} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </AppButton>
  );
}
