import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INITIAL_ACTION_STATE, type ActionState } from "@/actions/state";
import { StandaloneChoreDetailsEditor } from "@/components/chore/StandaloneChoreDetailsEditor";

const action = async (): Promise<ActionState> => INITIAL_ACTION_STATE;
const schedule = { recurrenceType: "weekly" as const, intervalCount: 1, anchorDate: "2026-10-14", weekdays: [3], dayOfMonth: 1 };

describe("StandaloneChoreDetailsEditor", () => {
  it("keeps optional notes compact and exposes standalone identity fields inline", () => {
    render(<StandaloneChoreDetailsEditor action={action} initialValues={{ name: "Laundry", description: "", iconKey: "laundry", accentKey: "mint" }} schedule={schedule} />);
    expect(screen.getByText("No notes · No room")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit chore details" }));
    expect(screen.getByLabelText("Chore name")).toHaveValue("Laundry");
    expect(screen.getByLabelText("Icon")).toHaveValue("laundry");
    expect(screen.getByLabelText("Color")).toHaveValue("mint");
    expect(screen.getByLabelText("Notes")).toHaveValue("");
  });
});
