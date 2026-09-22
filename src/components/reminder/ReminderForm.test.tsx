import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReminderForm } from "@/components/reminder/ReminderForm";

vi.mock("@/actions/reminders", () => ({ saveReminderAction: vi.fn() }));

describe("ReminderForm", () => {
  it("uses personal reminder language without assignment semantics", () => {
    render(<ReminderForm choreId="chore-1" reminder={null} fallbackTimeZone="America/Chicago" />);
    expect(screen.getByText("Your reminder")).toBeVisible();
    expect(screen.getByText(/does not assign or claim/i)).toBeVisible();
    expect(screen.queryByText(/assigned to|responsible for/i)).not.toBeInTheDocument();
  });
});
