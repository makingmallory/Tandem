import { ChevronDown, Pencil } from "lucide-react";
import Link from "next/link";
import { ChoreCard } from "@/components/chore/ChoreCard";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { Pill } from "@/components/ui/Pill";
import type { Chore } from "@/data/chores/types";

type Labels = { roomNames: Map<string, string>; variantNames: Map<string, string> };

function targetSummary(targets: Chore[]) {
  const count = targets.length;
  if (targets.every((target) => target.room_id && !target.variant_id)) return `${count} ${count === 1 ? "room" : "rooms"}`;
  if (targets.every((target) => target.variant_id && !target.room_id)) return `${count} ${count === 1 ? "variant" : "variants"}`;
  return `${count} ${count === 1 ? "target" : "targets"}`;
}

export function RoutineGroup({ targets, labels }: Readonly<{ targets: Chore[]; labels: Labels }>) {
  const root = targets[0]!;
  const activeTargets = targets.filter((target) => target.is_active).length;
  const active = activeTargets > 0;
  const status = activeTargets === targets.length ? "Active" : active ? `${activeTargets} active` : "Paused";

  return <li className="routine-group">
    <details>
      <summary className={`routine-group__summary${active ? "" : " routine-group__summary--paused"}`}>
        <ChoreIcon iconKey={root.icon_key} accentKey={root.accent_key} />
        <span className="routine-group__body">
          <span className="routine-group__name">{root.name}</span>
          <span className="routine-group__count">{targetSummary(targets)}</span>
        </span>
        <span className="routine-group__actions">
          <Pill tone={active ? "active" : "paused"}>{status}</Pill>
          <ChevronDown aria-hidden="true" size={20} />
        </span>
      </summary>
      <Link className="icon-button routine-group__edit" href={`/chores/${root.id}/edit`} aria-label={`Edit ${root.name}`}>
        <Pencil aria-hidden="true" size={18} />
      </Link>
      <ul className="routine-group__targets" aria-label={`${root.name} targets`}>
        {targets.map((target) => <ChoreCard key={target.id} chore={target}
          roomName={target.room_id ? labels.roomNames.get(target.room_id) : undefined}
          variantName={target.variant_id ? labels.variantNames.get(target.variant_id) : undefined} compactTarget />)}
      </ul>
    </details>
  </li>;
}
