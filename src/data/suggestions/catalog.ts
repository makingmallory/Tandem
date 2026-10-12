import type { ChoreAccentKey } from "@/domain/chores/accents";
import type { ChoreIconKey } from "@/domain/chores/icons";

export const SUGGESTION_COLLECTIONS = ["Cleaning", "Bathroom", "Kitchen", "Laundry", "Pet Care", "Home Maintenance"] as const;
export type SuggestionCollection = (typeof SUGGESTION_COLLECTIONS)[number];

export type SuggestedSchedule = {
  label: string;
  recurrenceType: "daily" | "interval_days" | "weekly" | "interval_weeks" | "monthly";
  intervalCount: number;
};

export type SuggestionPreset = {
  id: string;
  collection: SuggestionCollection;
  kind: "chore" | "category";
  name: string;
  description: string;
  iconKey: ChoreIconKey;
  accentKey: ChoreAccentKey;
  schedule: SuggestedSchedule;
  subtasks?: readonly string[];
  variants?: readonly string[];
  roomHint?: string;
};

const weekly: SuggestedSchedule = { label: "Suggested weekly", recurrenceType: "weekly", intervalCount: 1 };
const daily: SuggestedSchedule = { label: "Suggested daily", recurrenceType: "daily", intervalCount: 1 };
const everyTwoWeeks: SuggestedSchedule = { label: "Suggested every 2 weeks", recurrenceType: "interval_weeks", intervalCount: 2 };

export const SUGGESTION_PRESETS: readonly SuggestionPreset[] = [
  { id: "bathroom-cleaning", collection: "Bathroom", kind: "category", name: "Bathroom Cleaning", description: "A weekly reset for bathroom surfaces and floors.", iconKey: "bathtub", accentKey: "sky", schedule: weekly, roomHint: "Bathroom", subtasks: ["Clean toilet", "Clean sink and countertop", "Clean mirror", "Sweep or vacuum floor", "Mop floor", "Clean shower or tub"] },
  { id: "kitchen-cleaning", collection: "Kitchen", kind: "category", name: "Kitchen Cleaning", description: "A deeper clean for the kitchen each week.", iconKey: "dishes", accentKey: "amber", schedule: weekly, roomHint: "Kitchen", subtasks: ["Wipe countertops", "Clean sink", "Clean stovetop", "Wipe appliance fronts", "Sweep or vacuum floor", "Mop floor"] },
  { id: "quick-kitchen-reset", collection: "Kitchen", kind: "category", name: "Quick Kitchen Reset", description: "A short daily reset to keep the kitchen ready.", iconKey: "sparkle", accentKey: "mint", schedule: daily, roomHint: "Kitchen", subtasks: ["Clear counters", "Wipe counters", "Clean sink", "Put away stray items"] },
  { id: "vacuum-floors", collection: "Cleaning", kind: "chore", name: "Vacuum Floors", description: "A room-oriented floor care reminder.", iconKey: "vacuum", accentKey: "teal", schedule: weekly, roomHint: "Choose rooms with floors to vacuum" },
  { id: "dust-surfaces", collection: "Cleaning", kind: "chore", name: "Dust Surfaces", description: "A simple routine for shelves, tables, and ledges.", iconKey: "sparkle", accentKey: "lavender", schedule: everyTwoWeeks },
  { id: "laundry", collection: "Laundry", kind: "category", name: "Laundry", description: "Separate schedules can keep each load type on track.", iconKey: "laundry", accentKey: "peach", schedule: weekly, subtasks: ["Wash", "Dry", "Fold / put away"], variants: ["Darks", "Whites", "Towels", "Bedding"] },
  { id: "change-bedding", collection: "Laundry", kind: "chore", name: "Change Bedding", description: "Refresh sheets and bedding on a regular rhythm.", iconKey: "bed", accentKey: "lavender", schedule: everyTwoWeeks },
  { id: "clean-refrigerator", collection: "Kitchen", kind: "category", name: "Clean Refrigerator", description: "A monthly refresh for food storage.", iconKey: "dishes", accentKey: "sky", schedule: { label: "Suggested monthly", recurrenceType: "monthly", intervalCount: 1 }, roomHint: "Kitchen", subtasks: ["Remove expired food", "Wipe shelves and drawers", "Wipe interior surfaces", "Wipe exterior and handles"] },
  { id: "scoop-litter", collection: "Pet Care", kind: "chore", name: "Scoop Litter", description: "A daily pet-care reminder.", iconKey: "paw", accentKey: "mint", schedule: daily },
  { id: "clean-pet-bowls", collection: "Pet Care", kind: "category", name: "Clean Pet Bowls / Fountain", description: "A weekly refresh for food and water stations.", iconKey: "paw", accentKey: "teal", schedule: weekly, subtasks: ["Wash food bowls", "Wash water bowl or fountain", "Refill fresh water"] },
  { id: "replace-hvac-filter", collection: "Home Maintenance", kind: "chore", name: "Replace HVAC Filter", description: "A seasonal home-maintenance reminder.", iconKey: "home", accentKey: "amber", schedule: { label: "Suggested every 3 months", recurrenceType: "interval_weeks", intervalCount: 12 } },
];

export function getSuggestionPreset(id: string | undefined) {
  return SUGGESTION_PRESETS.find((preset) => preset.id === id);
}
