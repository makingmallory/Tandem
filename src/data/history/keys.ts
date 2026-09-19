export const historyKeys = {
  all: ["history"] as const,
  household: (householdId: string) => [...historyKeys.all, "household", householdId] as const,
};
