"use client";

import { CircleAlert } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went sideways",
  description = "We could not load this right now. Please try again.",
  onRetry,
}: Readonly<ErrorStateProps>) {
  return (
    <Card className="state-card">
      <span className="state-card__icon">
        <CircleAlert aria-hidden="true" size={24} />
      </span>
      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__copy">{description}</p>
      {onRetry ? (
        <AppButton type="button" onClick={onRetry}>
          Try again
        </AppButton>
      ) : null}
    </Card>
  );
}
