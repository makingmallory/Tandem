import type { Chore } from "@/data/chores/types";

export type ChoreListEntry = { kind: "chore"; chore: Chore } | { kind: "group"; targets: Chore[] };

export function groupChores(chores: Chore[], routineKinds: Map<string, "chore" | "category">): ChoreListEntry[] {
  const byRoutine = new Map<string, Chore[]>();
  const entries: ChoreListEntry[] = [];
  for (const chore of chores) {
    if (!chore.routine_id || !routineKinds.has(chore.routine_id)) {
      entries.push({ kind: "chore", chore });
      continue;
    }
    const targets = byRoutine.get(chore.routine_id) ?? [];
    targets.push(chore);
    byRoutine.set(chore.routine_id, targets);
  }
  for (const targets of byRoutine.values()) {
    const shouldGroup = targets.length > 1 || targets.some((target) => target.room_id || target.variant_id);
    entries.push(shouldGroup ? { kind: "group", targets } : { kind: "chore", chore: targets[0]! });
  }
  return entries.sort((left, right) => {
    const leftName = left.kind === "group" ? left.targets[0]!.name : left.chore.name;
    const rightName = right.kind === "group" ? right.targets[0]!.name : right.chore.name;
    return leftName.localeCompare(rightName);
  });
}

export function isActiveEntry(entry: ChoreListEntry) {
  return entry.kind === "group" ? entry.targets.some((target) => target.is_active) : entry.chore.is_active;
}
