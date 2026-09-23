import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReminderForm } from "@/components/reminder/ReminderForm";
import type { ChoreReminderRow } from "@/data/supabase/types";

vi.mock("@/actions/reminders", () => ({ saveReminderAction: vi.fn() }));

function reminder(
  id: string,
  offsetValue: number,
  offsetUnit: ChoreReminderRow["offset_unit"],
  localTime: string,
): ChoreReminderRow {
  return {
    id,
    household_id: "household-1",
    chore_id: "chore-1",
    user_id: "user-1",
    enabled: true,
    selected: true,
    reminder_type: "due_time",
    offset_value: offsetValue,
    offset_unit: offsetUnit,
    local_time: `${localTime}:00`,
    timezone: "America/Chicago",
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
  };
}

function renderForm(reminders: ChoreReminderRow[] = [], recurrenceType: "weekly" | "daily" = "weekly") {
  return render(
    <ReminderForm
      choreId="chore-1"
      reminders={reminders}
      fallbackTimeZone="America/Chicago"
      recurrenceType={recurrenceType}
      intervalCount={1}
    />,
  );
}

describe("ReminderForm", () => {
  it("progressively reveals a compact notification builder", () => {
    renderForm();
    const toggle = screen.getByRole("switch", { name: /Notifications/ });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole("button", { name: /Add notification/ })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("group", { name: "Notification 1" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Add notification/ })).toBeVisible();
  });

  it("adds, edits, and removes arbitrary reminder rows", () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("switch", { name: /Notifications/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add notification/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add notification/ }));

    fireEvent.change(screen.getByLabelText("Offset for notification 2"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Unit for notification 2"), { target: { value: "week" } });
    fireEvent.change(screen.getByLabelText("Hour for notification 2"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Offset for notification 3"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Unit for notification 3"), { target: { value: "month" } });

    const serialized = JSON.parse((container.querySelector('input[name="reminders"]') as HTMLInputElement).value);
    expect(serialized).toEqual([
      { offsetValue: 0, offsetUnit: "day", localTime: "10:00" },
      { offsetValue: 2, offsetUnit: "week", localTime: "09:00" },
      { offsetValue: 3, offsetUnit: "month", localTime: "10:00" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Remove notification 2" }));
    expect(screen.getAllByRole("group", { name: /Notification/ })).toHaveLength(2);
  });

  it("restores independently timed saved rows", () => {
    renderForm([
      reminder("due", 0, "day", "08:00"),
      reminder("two-days", 2, "day", "09:00"),
      reminder("week", 1, "week", "07:30"),
    ]);
    expect(screen.getByRole("switch", { name: /Notifications/ })).toBeChecked();
    expect(screen.getAllByRole("group", { name: /Notification/ })).toHaveLength(3);
    expect(screen.getByLabelText("Timing for notification 1")).toHaveValue("due");
    expect(screen.getByLabelText("Offset for notification 2")).toHaveValue(2);
    expect(screen.getByLabelText("Unit for notification 3")).toHaveValue("week");
    expect(screen.getByLabelText("Hour for notification 1")).toHaveValue("8");
    expect(screen.getByLabelText("Minute for notification 3")).toHaveValue("30");
    expect(screen.getByLabelText("AM or PM for notification 3")).toHaveValue("AM");
  });

  it("offers only 5-minute slots and converts the 12-hour selection before submission", () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("switch", { name: /Notifications/ }));
    const minutes = screen.getByLabelText("Minute for notification 1");
    expect(Array.from(minutes.querySelectorAll("option")).map((option) => option.value))
      .toEqual(["", "00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
    expect(screen.queryByDisplayValue("10:00")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="time"]')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Hour for notification 1"), { target: { value: "12" } });
    fireEvent.change(minutes, { target: { value: "05" } });
    expect(JSON.parse((container.querySelector('input[name="reminders"]') as HTMLInputElement).value)[0])
      .toEqual({ offsetValue: 0, offsetUnit: "day", localTime: "00:05" });
    fireEvent.change(screen.getByLabelText("AM or PM for notification 1"), { target: { value: "PM" } });
    const serialized = JSON.parse((container.querySelector('input[name="reminders"]') as HTMLInputElement).value);
    expect(serialized[0]).toEqual({ offsetValue: 0, offsetUnit: "day", localTime: "12:05" });
  });

  it("keeps legacy off-grid times visible and requires an explicit correction", () => {
    const { container } = renderForm([reminder("legacy", 0, "day", "08:03")]);
    expect(screen.getByText(/Saved time 8:03 AM is not on a 5-minute boundary/i)).toBeVisible();
    const minute = screen.getByLabelText("Minute for notification 1");
    expect(minute).toHaveValue("");
    expect(minute).toBeRequired();
    expect(JSON.parse((container.querySelector('input[name="reminders"]') as HTMLInputElement).value)[0].localTime)
      .toBe("08:03");

    fireEvent.change(minute, { target: { value: "05" } });
    expect(minute).toHaveValue("05");
    expect(screen.queryByText(/not on a 5-minute boundary/i)).not.toBeInTheDocument();
  });

  it("keeps daily chores to one due-date notification", () => {
    renderForm([], "daily");
    fireEvent.click(screen.getByRole("switch", { name: /Notifications/ }));
    expect(screen.getByText("On the due date")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Add notification/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Offset for notification/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Remove notification/)).not.toBeInTheDocument();
  });
});
