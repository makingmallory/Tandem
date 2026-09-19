export const completionKeys = {
  all: ["completions"] as const,
  household: (householdId: string) => [...completionKeys.all, "household", householdId] as const,
};
