export const choreKeys = {
  all: ["chores"] as const,
  household: (householdId: string) => [...choreKeys.all, "household", householdId] as const,
  detail: (householdId: string, choreId: string) =>
    [...choreKeys.household(householdId), "detail", choreId] as const,
};
