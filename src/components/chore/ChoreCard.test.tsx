import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChoreCard } from "@/components/chore/ChoreCard";
import type { Chore } from "@/data/chores/types";

function chore(isActive: boolean): Chore {
  return {
    id: "chore-1",
    household_id: "household-1",
    name: "Clean bathroom",
    description: null,
    icon_key: "bathtub",
    accent_key: "sky",
    recurrence_type: "weekly",
    interval_count: 1,
    anchor_date: "2026-09-22",
    weekdays: [2],
    day_of_month: null,
    is_active: isActive,
    created_by: "user-1",
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
  };
}

describe("ChoreCard action alignment", () => {
  it.each([[true, "Active"], [false, "Paused"]] as const)(
    "keeps the %s status and chevron together in the vertically centered action cluster",
    (isActive, label) => {
      const { container } = render(<ul><ChoreCard chore={chore(isActive)} /></ul>);
      const cluster = screen.getByTestId("chore-card-action-cluster");
      expect(cluster).toContainElement(screen.getByText(label));
      expect(cluster.querySelector(".chore-card__chevron")).toBeInTheDocument();
      expect(container.querySelector(".chore-card__body")).not.toContainElement(screen.getByText(label));
    },
  );
});
