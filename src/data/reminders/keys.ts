export const reminderKeys = {
  all: ["reminders"] as const,
  user: (userId: string) => [...reminderKeys.all, "user", userId] as const,
  chore: (userId: string, choreId: string) => [...reminderKeys.user(userId), "chore", choreId] as const,
};
