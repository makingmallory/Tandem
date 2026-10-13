import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INITIAL_ACTION_STATE, type ActionState } from "@/actions/state";
import { CategoryTargetForm } from "@/components/chore/CategoryTargetForm";

const action = async (): Promise<ActionState> => INITIAL_ACTION_STATE;
const schedule = { recurrenceType: "weekly" as const, intervalCount: 1, anchorDate: "2026-10-14", weekdays: [3], dayOfMonth: 1 };
const subtasks = [{ id: "81111111-1111-4111-8111-111111111111", title: "Clean toilet" }, { id: "82222222-2222-4222-8222-222222222222", title: "Clean shower" }];

describe("CategoryTargetForm", () => {
  it("shows compact schedule and included-subtask summaries before inline editing", () => {
    render(<CategoryTargetForm action={action} initialSchedule={schedule} subtasks={subtasks} initialApplicableSubtaskIds={[subtasks[0]!.id]} />);
    expect(screen.getByText(/Every Wednesday · Starts Oct 14/)).toBeVisible();
    expect(screen.getByText("Clean toilet")).toBeVisible();
    expect(screen.queryByText("Clean shower", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit schedule" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit included subtasks" })).toBeVisible();
  });

  it("uses a compact select schedule editor and progressively reveals weekday controls", () => {
    render(<CategoryTargetForm action={action} initialSchedule={schedule} subtasks={subtasks} initialApplicableSubtaskIds={[subtasks[0]!.id]} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit schedule" }));
    expect(screen.getByLabelText("How often")).toHaveValue("weekly");
    expect(screen.getByLabelText("Starts")).toHaveValue("2026-10-14");
    expect(screen.getByLabelText("Wednesday")).toBeChecked();
    fireEvent.change(screen.getByLabelText("How often"), { target: { value: "monthly" } });
    expect(screen.queryByLabelText("Wednesday")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Day of the month")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/Every Wednesday · Starts Oct 14/)).toBeVisible();
  });

  it("prefills and edits applicability without exposing master-definition controls", () => {
    const { container } = render(<CategoryTargetForm action={action} initialSchedule={schedule} subtasks={subtasks} initialApplicableSubtaskIds={[subtasks[0]!.id]} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit included subtasks" }));
    expect(screen.getByLabelText("Clean toilet")).toBeChecked();
    expect(screen.getByLabelText("Clean shower")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("Clean shower"));
    expect(new FormData(container.querySelector("form")!).getAll("applicableSubtaskIds")).toEqual([subtasks[0]!.id, subtasks[1]!.id]);
    expect(screen.queryByRole("button", { name: /Add subtask/ })).not.toBeInTheDocument();
  });
});
