import { CalendarClock, Check, SkipForward, Undo2 } from "lucide-react";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { getHouseholdActivity } from "@/data/history/queries";
import { historyFixtures } from "@/data/history/test-fixtures";
import type { ActivityEvent } from "@/data/history/types";
import { getCurrentHousehold } from "@/data/household/queries";
import { formatTime } from "@/domain/formatters/dates";
import { activityTitle, groupActivity } from "@/domain/history/groupActivity";
import { isShellTestMode } from "@/lib/test-mode";

function EventIcon({ type }: Readonly<{ type: ActivityEvent["event_type"] }>) {
  const Icon = type === "chore_completed"
    ? Check
    : type === "chore_uncompleted"
      ? Undo2
      : type === "chore_skipped"
        ? SkipForward
        : CalendarClock;
  return <span className="activity-item__icon"><Icon aria-hidden="true" size={19} /></span>;
}

export default async function HistoryPage() {
  let events: ActivityEvent[];
  if (isShellTestMode()) {
    events = historyFixtures();
  } else {
    const household = await getCurrentHousehold();
    if (!household) redirect("/setup");
    events = await getHouseholdActivity(household.id);
  }
  const groups = groupActivity(events, new Date(), HOUSEHOLD_TIME_ZONE);

  return (
    <PageShell title="History" variant="root">
      <div className="page-stack">
        <p className="eyebrow">Little wins, remembered</p>
        {groups.length ? groups.map((group) => (
          <section className="section-stack" aria-labelledby={`history-${group.label.replace(" ", "-")}`} key={group.label}>
            <h2 className="section-heading" id={`history-${group.label.replace(" ", "-")}`}>{group.label}</h2>
            <ul className="activity-list">
              {group.items.map((event) => (
                <li className="activity-item" key={event.id}>
                  <EventIcon type={event.event_type} />
                  <div>
                    <p className="activity-item__title">{activityTitle(event)}</p>
                    <p className="activity-item__meta">
                      {event.actor?.display_name ?? "Household member"} · {formatTime(event.created_at, HOUSEHOLD_TIME_ZONE)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )) : (
          <EmptyState title="No shared activity yet" description="Completed, skipped, and rescheduled chores will appear here." />
        )}
      </div>
    </PageShell>
  );
}
