import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoutineGroup } from "@/components/chore/RoutineGroup";
import type { Chore } from "@/data/chores/types";

function chore(id: string, overrides: Partial<Chore> = {}): Chore {
  return { id, household_id: "home-1", name: "Clean Bathroom", description: null, icon_key: "bathtub", accent_key: "sky",
    recurrence_type: "weekly", interval_count: 1, anchor_date: "2026-10-14", weekdays: [3], day_of_month: null,
    room_id: null, routine_id: "routine-1", variant_id: null, retired_at: null, is_active: true, created_by: "user-1",
    created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z", ...overrides };
}

describe("RoutineGroup", () => {
  it("renders room targets under one collapsed Category root with their own links and schedules", () => {
    render(<RoutineGroup targets={[chore("target-1", { room_id: "room-1" }), chore("target-2", { room_id: "room-2", recurrence_type: "daily" })]}
      labels={{ roomNames: new Map([["room-1", "Upstairs Bathroom"], ["room-2", "Downstairs Bathroom"]]), variantNames: new Map() }} />);
    expect(screen.getByText("Clean Bathroom")).toBeVisible();
    expect(screen.getByText("2 rooms")).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit Clean Bathroom" })).toHaveAttribute("href", "/chores/target-1/edit");
    expect(screen.getByText("Clean Bathroom").closest("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Clean Bathroom"));
    expect(screen.getByRole("link", { name: "Edit Clean Bathroom" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit Clean Bathroom" })).toHaveClass("routine-group__edit");
    const targets = screen.getByLabelText("Clean Bathroom targets");
    expect(within(targets).getByRole("link", { name: /Upstairs Bathroom/ })).toHaveAttribute("href", "/chores/target-1");
    expect(within(targets).getByRole("link", { name: /Downstairs Bathroom/ })).toHaveAttribute("href", "/chores/target-2");
    expect(within(targets).getByText("Every day")).toBeVisible();
    expect(within(targets).getByRole("link", { name: /Upstairs Bathroom/ })).toHaveClass("chore-card--target");
    expect(within(targets).getAllByRole("img", { name: "Bathtub" })).toHaveLength(2);
  });

  it("opens the root editor without changing the expanded state", () => {
    render(<RoutineGroup targets={[chore("target-1", { room_id: "room-1" }), chore("target-2", { room_id: "room-2" })]}
      labels={{ roomNames: new Map([["room-1", "Upstairs Bathroom"], ["room-2", "Downstairs Bathroom"]]), variantNames: new Map() }} />);
    const details = screen.getByText("Clean Bathroom").closest("details")!;
    expect(screen.getByRole("link", { name: "Edit Clean Bathroom" })).toHaveAttribute("href", "/chores/target-1/edit");
    expect(details).not.toHaveAttribute("open");
  });

  it("uses the same root grouping for explicit variant targets", () => {
    render(<RoutineGroup targets={[chore("target-1", { variant_id: "variant-1" }), chore("target-2", { variant_id: "variant-2" })]}
      labels={{ roomNames: new Map(), variantNames: new Map([["variant-1", "Light load"], ["variant-2", "Heavy load"]]) }} />);
    expect(screen.getByText("2 variants")).toBeVisible();
    fireEvent.click(screen.getByText("Clean Bathroom"));
    expect(screen.getByRole("link", { name: /Light load/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Heavy load/ })).toBeVisible();
  });
});
