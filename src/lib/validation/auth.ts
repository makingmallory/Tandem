import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use no more than 72 characters.");
const passwordConfirmation = z.string().min(1, "Confirm your password.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Enter the name you want your household to see.")
      .max(80, "Keep your name under 80 characters."),
    email,
    password,
    confirmPassword: passwordConfirmation,
    next: z.string().optional(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export const changePasswordSchema = z
  .object({
    password,
    confirmPassword: passwordConfirmation,
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export function safeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}
