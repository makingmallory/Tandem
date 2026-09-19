import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionState } from "@/actions/state";
import { OccurrenceActions } from "@/components/occurrence/OccurrenceActions";

const completeAction = vi.hoisted(() => vi.fn());

vi.mock("@/actions/occurrences", () => ({
  completeOccurrenceAction: completeAction,
  undoOccurrenceAction: vi.fn(),
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

    render(<OccurrenceActions occurrenceId="occurrence-1" status="scheduled" scheduledDate="2026-09-18" />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as Done" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled());
    act(() => resolveCompletion?.({ status: "success", successMessage: "Chore marked done." }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark as Done" })).toBeEnabled();
      expect(screen.getByText("Chore marked done.")).toBeVisible();
    });
  });

  it("restores the button and renders an error when completion fails", async () => {
    completeAction.mockResolvedValue({ status: "error", formError: "We could not update this chore." });
    render(<OccurrenceActions occurrenceId="occurrence-1" status="scheduled" scheduledDate="2026-09-18" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark as Done" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark as Done" })).toBeEnabled();
      expect(screen.getByRole("alert")).toHaveTextContent("We could not update this chore.");
    });
  });
});
