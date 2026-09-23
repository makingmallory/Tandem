import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { Pill } from "@/components/ui/Pill";
import type { Chore } from "@/data/chores/types";
import { formatRecurrence } from "@/domain/formatters/recurrence";

export function ChoreCard({ chore }: Readonly<{ chore: Chore }>) {
  return (
    <li>
      <Link
        className={`chore-card${chore.is_active ? "" : " chore-card--paused"}`}
        href={`/chores/${chore.id}`}
      >
        <ChoreIcon iconKey={chore.icon_key} accentKey={chore.accent_key} />
        <span className="chore-card__body">
          <span className="chore-card__name">{chore.name}</span>
          <span className="chore-card__schedule">
            {formatRecurrence({
              recurrenceType: chore.recurrence_type,
              intervalCount: chore.interval_count,
              weekdays: chore.weekdays,
              dayOfMonth: chore.day_of_month,
            })}
          </span>
        </span>
        <span className="chore-card__actions" data-testid="chore-card-action-cluster">
          <Pill tone={chore.is_active ? "active" : "paused"}>
            {chore.is_active ? "Active" : "Paused"}
          </Pill>
          <ChevronRight className="chore-card__chevron" aria-hidden="true" size={20} />
        </span>
      </Link>
    </li>
  );
}
