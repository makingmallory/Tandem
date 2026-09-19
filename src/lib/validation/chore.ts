import { z } from "zod";
import { CHORE_ACCENT_KEYS } from "@/domain/chores/accents";
import { CHORE_ICON_KEYS } from "@/domain/chores/icons";
import { RECURRENCE_TYPES } from "@/domain/chores/recurrence";
import { isDateOnly } from "@/domain/dates/date-only";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const choreSchema = z
  .object({
    name: z.string().trim().min(1, "Give this chore a name.").max(100, "Keep the name under 100 characters."),
    description: z
      .string()
      .trim()
      .max(500, "Keep notes under 500 characters.")
      .transform((value) => value || null),
    iconKey: z.enum(CHORE_ICON_KEYS, { error: "Choose an icon." }),
    accentKey: z.enum(CHORE_ACCENT_KEYS, { error: "Choose an accent color." }),
    recurrenceType: z.enum(RECURRENCE_TYPES, { error: "Choose a frequency." }),
    intervalCount: z.coerce.number().int().min(1, "Use a number of at least 1.").max(52, "Use a number no larger than 52."),
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
    dayOfMonth: z.coerce.number().int().min(1, "Choose a day from 1 to 31.").max(31, "Choose a day from 1 to 31.").nullable(),
    anchorDate: z.string().regex(datePattern, "Choose a valid starting date.").refine(isDateOnly, "Choose a valid starting date."),
  })
  .superRefine((value, context) => {
    if (["weekly", "interval_weeks"].includes(value.recurrenceType) && value.weekdays.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Choose at least one day of the week.",
      });
    }
    if (value.recurrenceType === "monthly" && value.dayOfMonth === null) {
      context.addIssue({
        code: "custom",
        path: ["dayOfMonth"],
        message: "Choose a day of the month.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    intervalCount: ["daily", "weekly", "monthly"].includes(value.recurrenceType)
      ? 1
      : value.intervalCount,
    weekdays: ["weekly", "interval_weeks"].includes(value.recurrenceType)
      ? [...new Set(value.weekdays)].sort((a, b) => a - b)
      : null,
    dayOfMonth: value.recurrenceType === "monthly" ? value.dayOfMonth : null,
  }));

export type ChoreInput = z.output<typeof choreSchema>;

export function choreFormDataToInput(formData: FormData) {
  const dayOfMonth = formData.get("dayOfMonth");
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    iconKey: formData.get("iconKey"),
    accentKey: formData.get("accentKey"),
    recurrenceType: formData.get("recurrenceType"),
    intervalCount: formData.get("intervalCount") ?? 1,
    weekdays: formData.getAll("weekdays"),
    dayOfMonth: dayOfMonth === null || dayOfMonth === "" ? null : dayOfMonth,
    anchorDate: formData.get("anchorDate"),
  };
}
