import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INITIAL_ACTION_STATE, type ActionState } from "@/actions/state";
import { InlineScheduleEditor } from "@/components/chore/InlineScheduleEditor";

const action = async (): Promise<ActionState> => INITIAL_ACTION_STATE;
const schedule = { recurrenceType: "weekly" as const, intervalCount: 1, anchorDate: "2026-10-14", weekdays: [3], dayOfMonth: 1 };

describe("InlineScheduleEditor", () => {
  it("uses the same compact schedule editor for an individual chore or target", () => {
    render(<InlineScheduleEditor action={action} initialSchedule={schedule} />);
    expect(screen.getByText(/Every Wednesday · Starts Oct 14/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit schedule" }));
    expect(screen.getByLabelText("How often")).toHaveValue("weekly");
    fireEvent.change(screen.getByLabelText("How often"), { target: { value: "monthly" } });
    expect(screen.getByLabelText("Day of the month")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/Every Wednesday · Starts Oct 14/)).toBeVisible();
  });
});
