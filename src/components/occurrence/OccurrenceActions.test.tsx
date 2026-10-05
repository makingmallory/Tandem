import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionState } from "@/actions/state";
import { OccurrenceActions } from "@/components/occurrence/OccurrenceActions";

const completeAction = vi.hoisted(() => vi.fn());
const undoAction = vi.hoisted(() => vi.fn());

vi.mock("@/actions/occurrences", () => ({
  completeOccurrenceAction: completeAction,
  undoOccurrenceAction: undoAction,
  skipOccurrenceAction: vi.fn(),
  rescheduleOccurrenceAction: vi.fn(),
}));

describe("OccurrenceActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leaves the pending state when a successful completion action resolves", async () => {
    let resolveCompletion: ((state: ActionState) => void) | undefined;
    completeAction.mockImplementation(() => new Promise<ActionState>((resolve) => {
      resolveCompletion = resolve;
    }));

    render(<OccurrenceActions occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-09-18" />);
    fireEvent.click(screen.getByRole("button", { name: "Mark Clean bathroom as complete" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Mark Clean bathroom as complete" });
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("Saving…");
    });
    act(() => resolveCompletion?.({ status: "success", successMessage: "Chore marked done." }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark Clean bathroom as complete" })).toBeEnabled();
      expect(screen.getByText("Chore marked done.")).toBeVisible();
    });
  });

  it("restores the button and renders an error when completion fails", async () => {
    completeAction.mockResolvedValue({ status: "error", formError: "We could not update this chore." });
    render(<OccurrenceActions occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-09-18" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark Clean bathroom as complete" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark Clean bathroom as complete" })).toBeEnabled();
      expect(screen.getByRole("alert")).toHaveTextContent("We could not update this chore.");
    });
  });

  it("keeps completion primary and moves secondary actions plus edit into one compact menu", () => {
    render(<OccurrenceActions occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-09-18" />);

    const actionCluster = screen.getByTestId("occurrence-action-cluster");
    expect(screen.getByRole("button", { name: "Mark Clean bathroom as complete" })).toHaveTextContent("Mark as Done");
    expect(actionCluster).toContainElement(screen.getByLabelText("More actions for Clean bathroom"));
    expect(screen.queryByRole("button", { name: "Skip this time" })).not.toBeVisible();
    fireEvent.click(screen.getByLabelText("More actions for Clean bathroom"));
    expect(screen.getByRole("button", { name: /Skip this time/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Edit chore/ })).toHaveAttribute("href", "/chores/chore-1/edit");
  });

  it("uses the completed primary control to undo without duplicating undo in the menu", () => {
    undoAction.mockResolvedValue({ status: "success", successMessage: "Chore marked incomplete." });
    render(<OccurrenceActions occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="completed" scheduledDate="2026-09-18" />);

    const undoButton = screen.getByRole("button", { name: "Mark Clean bathroom as incomplete" });
    expect(undoButton).toHaveTextContent("Completed");
    fireEvent.click(undoButton);
    expect(undoAction).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("More actions for Clean bathroom"));
    expect(screen.queryByRole("button", { name: /Mark incomplete/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit chore/ })).toBeVisible();
  });

  it("renders the Home presentation as an accessible completion circle without the secondary menu", () => {
    render(<OccurrenceActions compact occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-09-18" />);

    const button = screen.getByRole("button", { name: "Mark Clean bathroom as complete" });
    expect(button).toHaveClass("occurrence-actions__completion--compact");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Incomplete");
    expect(screen.queryByLabelText("More actions for Clean bathroom")).not.toBeInTheDocument();
  });
});
