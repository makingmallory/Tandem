import { z } from "zod";

export const reminderSchema = z.object({
  enabled: z.boolean(),
  localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid reminder time."),
  timezone: z.string().min(1).max(100),
  reminderType: z.literal("due_time"),
});

export type ReminderInput = z.infer<typeof reminderSchema>;

export function reminderFormDataToInput(formData: FormData): ReminderInput {
  return {
    enabled: formData.get("enabled") === "on",
    localTime: String(formData.get("localTime") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    reminderType: "due_time",
  };
}
