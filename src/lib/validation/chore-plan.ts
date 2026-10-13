import { z } from "zod";
import { choreSchema, choreFormDataToInput } from "@/lib/validation/chore";
import { generateOccurrenceDates, occurrenceHorizonEnd } from "@/domain/recurrence/generateOccurrences";
import type { DateOnly } from "@/domain/dates/date-only";
import type { Json, ChoreRow } from "@/data/supabase/types";

export type ScheduleValues = {
  recurrenceType: ChoreRow["recurrence_type"]; intervalCount: number; anchorDate: string;
  weekdays: number[]; dayOfMonth: number;
};
export type SubtaskValue = { id: string | null; title: string; excludedTargets?: string[] };
export type VariantValue = { id: string | null; key: string; name: string };
export type TargetValue = { roomId: string | null; variantKey: string | null };
export function targetKey(target: TargetValue) {
  return target.variantKey ? `${target.roomId ? `room:${target.roomId}|` : ""}variant:${target.variantKey}` : target.roomId ?? "roomless";
}
export function resolveTargets(roomIds: string[], variants: VariantValue[], explicit: TargetValue[]): TargetValue[] {
  if (roomIds.length && variants.length) return explicit;
  if (variants.length) return variants.map((variant) => ({ roomId: null, variantKey: variant.key }));
  return roomIds.length ? roomIds.map((id) => ({ roomId: id, variantKey: null })) : [{ roomId: null, variantKey: null }];
}
const scheduleSchema = z.object({
  recurrenceType: z.enum(["daily", "interval_days", "weekly", "interval_weeks", "monthly"]),
  intervalCount: z.number().int().min(1).max(52), anchorDate: z.string(),
  weekdays: z.array(z.number().int().min(0).max(6)), dayOfMonth: z.number().int().min(1).max(31),
});
const planSchema = z.object({
  kind: z.enum(["chore", "category"]).default("chore"),
  roomIds: z.array(z.string().uuid()).max(100).refine((ids) => new Set(ids).size === ids.length, "Select each room once."),
  subtasks: z.array(z.object({ id: z.string().uuid().nullable(), title: z.string().trim().min(1).max(120), excludedTargets: z.array(z.string()).default([]) })).max(50),
  variants: z.array(z.object({ id: z.string().uuid().nullable(), key: z.string().uuid(), name: z.string().trim().min(1).max(60) })).max(50).default([]),
  explicitTargets: z.array(z.object({ roomId: z.string().uuid().nullable(), variantKey: z.string().uuid().nullable() })).max(100).default([]),
  customize: z.boolean(), schedule: scheduleSchema, schedules: z.record(z.string(), scheduleSchema),
});
export function scheduleValues(chore: ChoreRow): ScheduleValues {
  return { recurrenceType: chore.recurrence_type, intervalCount: chore.interval_count,
    anchorDate: chore.anchor_date, weekdays: chore.weekdays ?? [], dayOfMonth: chore.day_of_month ?? 1 };
}
export function sameSchedule(a: ScheduleValues, b: ScheduleValues) {
  return a.recurrenceType === b.recurrenceType && a.intervalCount === b.intervalCount && a.anchorDate === b.anchorDate
    && [...a.weekdays].sort((left, right) => left - right).join(",") === [...b.weekdays].sort((left, right) => left - right).join(",")
    && a.dayOfMonth === b.dayOfMonth;
}
export function schedulesAreShared(schedules: ScheduleValues[]) {
  return schedules.length < 2 || schedules.every((schedule) => sameSchedule(schedule, schedules[0]!));
}
export function parseChorePlan(formData: FormData, today: DateOnly) {
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("schedulePlan"))); } catch { raw = null; }
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return { error: "Check the selected rooms, subtasks, variants, and schedules.",
    fieldErrors: parsed.error.flatten().fieldErrors } as const;
  const plan = parsed.data;
  if (plan.kind === "chore" && plan.subtasks.length) return { error: "Choose Category to add subtasks." } as const;
  if (new Set(plan.variants.map((variant) => variant.key)).size !== plan.variants.length ||
      new Set(plan.variants.map((variant) => variant.name.toLowerCase())).size !== plan.variants.length) return { error: "Use unique variant names.", fieldErrors: { variants: ["Use unique variant names."] as string[] } } as const;
  const common = choreFormDataToInput(formData);
  const targets = [];
  const selectedTargets = resolveTargets(plan.roomIds, plan.variants, plan.explicitTargets);
  if (!selectedTargets.length) return { error: "Choose the Room + Variant targets explicitly.", fieldErrors: { targets: ["Add at least one target."] as string[] } } as const;
  if (new Set(selectedTargets.map(targetKey)).size !== selectedTargets.length) return { error: "Choose each target only once." } as const;
  const keys = selectedTargets.map(targetKey);
  let firstInput;
  for (const target of selectedTargets) {
    if ((target.roomId && !plan.roomIds.includes(target.roomId)) || (target.variantKey && !plan.variants.some((variant) => variant.key === target.variantKey))) return { error: "Check the selected targets." } as const;
    const key = targetKey(target);
    const schedule = plan.customize ? plan.schedules[key] : plan.schedule;
    if (!schedule) return { error: "Choose a schedule for every selected room." } as const;
    const chore = choreSchema.safeParse({ ...common, ...schedule });
    if (!chore.success) return { error: chore.error.issues[0]?.message ?? "Check the schedule.", fieldErrors: chore.error.flatten().fieldErrors } as const;
    const input = chore.data;
    firstInput ??= input;
    targets.push({ key, room_id: target.roomId, variant_key: target.variantKey, recurrence_type: input.recurrenceType, interval_count: input.intervalCount,
      anchor_date: input.anchorDate, weekdays: input.weekdays, day_of_month: input.dayOfMonth,
      occurrence_dates: generateOccurrenceDates({ ...input, anchorDate: input.anchorDate as DateOnly }, today, occurrenceHorizonEnd(today)) });
  }
  const input = firstInput!;
  return { input, kind: plan.kind, roomIds: plan.roomIds, subtasks: plan.subtasks, variants: plan.variants,
    payload: { kind: plan.kind, name: input.name, description: input.description, icon_key: input.iconKey, accent_key: input.accentKey,
      variants: plan.variants, subtasks: plan.subtasks.map((task) => ({ ...task, excludedTargets: task.excludedTargets.filter((key) => keys.includes(key)) })), targets } as Json } as const;
}
