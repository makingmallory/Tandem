import type { ButtonHTMLAttributes } from "react";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary";
};

export function AppButton({
  className = "",
  variant = "primary",
  ...props
}: Readonly<AppButtonProps>) {
  const variantClass = variant === "primary" ? "" : ` app-button--${variant}`;
  return <button className={`app-button${variantClass} ${className}`.trim()} {...props} />;
}
