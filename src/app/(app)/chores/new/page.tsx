import { createChoreAction } from "@/actions/chores";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { PageShell } from "@/components/layout/PageShell";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { todayDateOnly, weekday } from "@/domain/dates/date-only";

export default function AddChorePage() {
  const startDate = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  return (
    <PageShell title="Add a Chore" variant="detail" backHref="/chores">
      <ChoreForm
        action={createChoreAction}
        mode="create"
        initialValues={{
          name: "",
          description: "",
          iconKey: "sparkle",
          accentKey: "mint",
          recurrenceType: "weekly",
          intervalCount: 1,
          anchorDate: startDate,
          weekdays: [weekday(startDate)],
          dayOfMonth: Number(startDate.slice(-2)),
        }}
      />
    </PageShell>
  );
}
