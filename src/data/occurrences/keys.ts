export const occurrenceKeys = {
  all: ["occurrences"] as const,
  household: (householdId: string) => [...occurrenceKeys.all, "household", householdId] as const,
  range: (householdId: string, start: string, end: string) =>
    [...occurrenceKeys.household(householdId), "range", start, end] as const,
  today: (householdId: string, date: string) =>
    [...occurrenceKeys.household(householdId), "today", date] as const,
  overdue: (householdId: string, date: string) =>
    [...occurrenceKeys.household(householdId), "overdue", date] as const,
};

