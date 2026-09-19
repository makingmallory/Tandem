import { WEEKDAYS, type RecurrenceDefinition } from "@/domain/chores/recurrence";

function joinFriendly(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function formatRecurrence(definition: RecurrenceDefinition): string {
  const { recurrenceType, intervalCount, weekdays, dayOfMonth } = definition;

  if (recurrenceType === "daily") return "Every day";
  if (recurrenceType === "interval_days") {
    return intervalCount === 1 ? "Every day" : `Every ${intervalCount} days`;
  }
  if (recurrenceType === "monthly") {
    return `Monthly on the ${ordinal(dayOfMonth ?? 1)}`;
  }

  const weekdayLabels = (weekdays ?? [])
    .slice()
    .sort((a, b) => a - b)
    .flatMap((value) => {
      const label = WEEKDAYS.find((weekday) => weekday.value === value)?.label;
      return label ? [label] : [];
    });
  const schedule = joinFriendly(weekdayLabels);

  if (recurrenceType === "weekly") return `Every ${schedule}`;
  return `Every ${intervalCount} weeks on ${schedule}`;
}
