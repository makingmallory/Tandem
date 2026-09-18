import { z } from "zod";

export const householdNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your household a name.")
    .max(80, "Keep the household name under 80 characters."),
});

export const inviteCodeSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .length(12, "Invite codes are 12 characters long.")
        .regex(/^[A-F0-9]+$/, "Enter a valid invite code."),
    ),
});

export function inviteCodeFromPath(value: string) {
  const result = inviteCodeSchema.safeParse({ inviteCode: value });
  return result.success ? result.data.inviteCode : value.toUpperCase();
}
