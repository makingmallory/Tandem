"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { AppButton } from "@/components/ui/AppButton";

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
};

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  ...buttonProps
}: Readonly<SubmitButtonProps>) {
  const { pending } = useFormStatus();

  return (
    <AppButton type="submit" variant={variant} disabled={pending} aria-disabled={pending} {...buttonProps}>
      {pending ? pendingLabel : children}
    </AppButton>
  );
}
