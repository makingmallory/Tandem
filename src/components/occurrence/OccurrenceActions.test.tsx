import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionState } from "@/actions/state";
import { OccurrenceActions } from "@/components/occurrence/OccurrenceActions";

const completeAction = vi.hoisted(() => vi.fn());
const undoAction = vi.hoisted(() => vi.fn());
const rescheduleAction = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: routerRefresh }) }));

vi.mock("@/actions/occurrences", () => ({
  completeOccurrenceAction: completeAction,
  undoOccurrenceAction: undoAction,
  skipOccurrenceAction: vi.fn(),
  rescheduleOccurrenceAction: rescheduleAction,
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

  it("renders the Home presentation with an accessible completion circle and compact action menu", () => {
    render(<OccurrenceActions compact occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-09-18" today="2026-09-18" />);

    const button = screen.getByRole("button", { name: "Mark Clean bathroom as complete" });
    expect(button).toHaveClass("occurrence-actions__completion--compact");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Incomplete");
    fireEvent.click(screen.getByLabelText("More actions for Clean bathroom"));
    expect(screen.getByRole("button", { name: /Tomorrow/ })).toBeVisible();
    expect(screen.getByLabelText("Choose another date")).toBeVisible();
    expect(screen.getByRole("button", { name: /Skip this time/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Edit chore/ })).not.toBeInTheDocument();
  });

  it("reschedules Home chores to the next household-local date", async () => {
    rescheduleAction.mockResolvedValue({ status: "success", successMessage: "Occurrence rescheduled." });
    render(<OccurrenceActions compact occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-03-08" today="2026-03-08" />);

    fireEvent.click(screen.getByLabelText("More actions for Clean bathroom"));
    fireEvent.click(screen.getByRole("button", { name: /Tomorrow/ }));

    await waitFor(() => expect(rescheduleAction).toHaveBeenCalled());
    const formData = rescheduleAction.mock.calls[0]?.[2] as FormData;
    expect(formData.get("scheduledDate")).toBe("2026-03-09");
  });

  it("submits the selected date from the Home reschedule form", async () => {
    rescheduleAction.mockResolvedValue({ status: "error", formError: "Choose another date." });
    render(<OccurrenceActions compact occurrenceId="occurrence-1" choreId="chore-1" choreName="Clean bathroom" status="scheduled" scheduledDate="2026-10-01" today="2026-10-05" />);

    fireEvent.click(screen.getByLabelText("More actions for Clean bathroom"));
    fireEvent.change(screen.getByLabelText("Choose another date"), { target: { value: "2026-10-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));

    await waitFor(() => expect(rescheduleAction).toHaveBeenCalled());
    const formData = rescheduleAction.mock.calls[0]?.[2] as FormData;
    expect(formData.get("scheduledDate")).toBe("2026-10-06");
  });

  it("does not show reschedule success beside stale occurrence props and refreshes them", async () => {
    rescheduleAction.mockResolvedValue({
      status: "success",
      successMessage: "Occurrence rescheduled.",
      rescheduledDate: "2026-10-06",
    });
    render(<OccurrenceActions compact occurrenceId="occurrence-1" choreId="chore-1" choreName="Test Chore" status="scheduled" scheduledDate="2026-10-01" today="2026-10-05" />);

    fireEvent.click(screen.getByLabelText("More actions for Test Chore"));
    fireEvent.click(screen.getByRole("button", { name: /Tomorrow/ }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
    expect(screen.queryByText("Occurrence rescheduled.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Choose another date")).toHaveValue("2026-10-01");
  });
});
