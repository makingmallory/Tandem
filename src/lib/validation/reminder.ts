import { z } from "zod";

export const REMINDER_OFFSET_UNITS = ["day", "week", "month"] as const;
export type ReminderOffsetUnit = (typeof REMINDER_OFFSET_UNITS)[number];

export type ReminderDefinition = {
  offsetValue: number;
  offsetUnit: ReminderOffsetUnit;
  localTime: string;
};

const unitMaximums: Record<ReminderOffsetUnit, number> = {
  day: 365,
  week: 52,
  month: 24,
};

export function reminderUnitLabel(unit: ReminderOffsetUnit, value: number) {
  return `${unit}${value === 1 ? "" : "s"}`;
}

export function reminderDefinitionLabel(definition: ReminderDefinition) {
  if (definition.offsetValue === 0) return `On the due date at ${definition.localTime}`;
  return `${definition.offsetValue} ${reminderUnitLabel(definition.offsetUnit, definition.offsetValue)} before at ${definition.localTime}`;
}

export function reminderMaximumForUnit(unit: ReminderOffsetUnit) {
  return unitMaximums[unit];
}

const reminderDefinitionSchema = z.object({
  offsetValue: z.coerce.number().int().min(0, "Use zero or a positive offset."),
  offsetUnit: z.enum(REMINDER_OFFSET_UNITS),
  localTime: z.string().regex(
    /^([01]\d|2[0-3]):[0-5][05]$/,
    "Choose a notification time in 5-minute increments.",
  ),
}).superRefine((definition, context) => {
  if (definition.offsetValue === 0 && definition.offsetUnit !== "day") {
    context.addIssue({ code: "custom", path: ["offsetUnit"], message: "Due-date notifications use days." });
  }
  if (definition.offsetValue > unitMaximums[definition.offsetUnit]) {
    context.addIssue({
      code: "custom",
      path: ["offsetValue"],
      message: `Use no more than ${unitMaximums[definition.offsetUnit]} ${reminderUnitLabel(definition.offsetUnit, unitMaximums[definition.offsetUnit])}.`,
    });
  }
});

export const reminderSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().min(1).max(100),
  reminderType: z.literal("due_time"),
  reminders: z.array(reminderDefinitionSchema).max(12, "Keep notifications to 12 or fewer."),
}).superRefine((value, context) => {
  if (value.enabled && value.reminders.length === 0) {
    context.addIssue({ code: "custom", path: ["reminders"], message: "Add at least one notification." });
  }
  const seen = new Set<string>();
  value.reminders.forEach((reminder, index) => {
    const key = `${reminder.offsetValue}:${reminder.offsetUnit}:${reminder.localTime}`;
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["reminders", index],
        message: "Remove the duplicate notification.",
      });
    }
    seen.add(key);
  });
});

export type ReminderInput = z.infer<typeof reminderSchema>;

export function reminderFormDataToInput(formData: FormData) {
  let reminders: unknown = [];
  try {
    reminders = JSON.parse(String(formData.get("reminders") ?? "[]"));
  } catch {
    reminders = [];
  }
  return {
    enabled: formData.get("enabled") === "on",
    timezone: String(formData.get("timezone") ?? ""),
    reminderType: "due_time",
    reminders,
  };
}
