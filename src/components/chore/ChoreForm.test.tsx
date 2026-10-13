import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { INITIAL_ACTION_STATE, type ActionState } from "@/actions/state";
import type { RoomRow } from "@/data/supabase/types";

const action = async (): Promise<ActionState> => INITIAL_ACTION_STATE;
const values = { name: "Clean Bathroom", description: "", iconKey: "bathtub", accentKey: "sky",
  recurrenceType: "weekly" as const, intervalCount: 1, anchorDate: "2026-10-14", weekdays: [3], dayOfMonth: 1 };
const rooms: RoomRow[] = ["Master Bathroom", "Downstairs Bathroom", "Kitchen"].map((name, index) => ({
  id: `81111111-1111-4111-8111-11111111111${index}`, household_id: "home-1", name, archived_at: null,
  created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z",
}));
function serialized(container: HTMLElement) {
  return JSON.parse((container.querySelector('[name="schedulePlan"]') as HTMLInputElement).value);
}
describe("ChoreForm rooms and routine editing", () => {
  it("defaults to no rooms and makes select all / clear all explicit", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="create" />);
    expect(screen.getByLabelText("Master Bathroom")).not.toBeChecked();
    expect(serialized(container).roomIds).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(serialized(container).roomIds).toEqual(rooms.map((room) => room.id));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(serialized(container).roomIds).toEqual([]);
  });
  it("offers a shared schedule by default, then lets one room change independently", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="create" />);
    fireEvent.click(screen.getByLabelText("Master Bathroom"));
    fireEvent.click(screen.getByLabelText("Downstairs Bathroom"));
    expect(screen.getByText("Same schedule for all rooms")).toBeVisible();
    expect(screen.getAllByLabelText("Starts")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Keep custom schedules" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit schedule for Downstairs Bathroom" }));
    const room = screen.getByText("Downstairs Bathroom", { selector: "strong" }).parentElement!.parentElement!;
    fireEvent.click(within(room).getByLabelText("Wednesday"));
    fireEvent.click(within(room).getByLabelText("Thursday"));
    const plan = serialized(container);
    expect(plan.schedules[rooms[0]!.id].weekdays).toEqual([3]);
    expect(plan.schedules[rooms[1]!.id].weekdays).toEqual([4]);
    expect(screen.getByLabelText("Kitchen")).not.toBeChecked();
  });
  it("opens differing saved schedules in customized mode and only enters shared conversion locally", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="edit"
      initialRoomIds={rooms.slice(0, 2).map((room) => room.id)}
      initialSchedules={{ [rooms[0]!.id]: values, [rooms[1]!.id]: { ...values, weekdays: [4] } }} />);
    expect(screen.getByText("Custom schedules")).toBeVisible();
    expect(screen.getAllByText("Master Bathroom")).toHaveLength(2);
    expect(screen.getByText("Every Wednesday · Starts Oct 14")).toBeVisible();
    expect(screen.getByText("Every Thursday · Starts Oct 14")).toBeVisible();
    expect(screen.getByRole("button", { name: "Convert to same schedule" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Convert to same schedule" }));
    expect(screen.getByText(/Saving will apply this schedule/)).toBeVisible();
    expect(serialized(container).customize).toBe(false);
  });
  it("supports adding, renaming, reordering and removing shared instructions", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="edit" kind="category"
      initialSubtasks={[{ id: rooms[0]!.id, title: "Clean toilet" }, { id: rooms[1]!.id, title: "Wipe counters" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Move subtask 2 up" }));
    expect(screen.getByLabelText("Subtask 1")).toHaveValue("Wipe counters");
    expect(screen.getByText("Subtask 1")).toHaveClass("visually-hidden");
    expect(screen.getByRole("button", { name: "Move subtask 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move subtask 2 down" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Subtask 1"), { target: { value: "Wipe surfaces" } });
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    fireEvent.change(screen.getByLabelText("Subtask 3"), { target: { value: "Mop floor" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove subtask 2" }));
    expect(serialized(container).subtasks.map((task: { title: string }) => task.title)).toEqual(["Wipe surfaces", "Mop floor"]);
  });
  it("keeps selected Rooms in a collapsed editing summary", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="edit" initialRoomIds={[rooms[0]!.id]} />);
    expect(container.querySelector(".room-selector")).not.toHaveAttribute("open");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(serialized(container).roomIds).toEqual([rooms[0]!.id]);
  });
  it("can open imported room-oriented suggestions without selecting a Room", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="create" initialRoomsOpen />);
    expect(container.querySelector(".room-selector")).toHaveAttribute("open");
    expect(rooms.every((room) => !screen.getByLabelText(room.name).hasAttribute("checked"))).toBe(true);
    expect(serialized(container).roomIds).toEqual([]);
  });
  it("defaults a subtask to every target and excludes only the requested room", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="edit" kind="category"
      initialRoomIds={[rooms[0]!.id,rooms[1]!.id]} initialSubtasks={[{ id: null, title: "Clean shower" }]} />);
    expect(screen.getByText("Applies to:")).toBeVisible();
    expect(screen.getByText("All rooms")).toBeVisible();
    const applies = screen.getByText("Applies to:").parentElement!.parentElement!;
    fireEvent.click(within(applies).getByText("Applies to:"));
    expect(within(applies).getByLabelText("Master Bathroom")).toBeChecked();
    fireEvent.click(within(applies).getByLabelText("Downstairs Bathroom"));
    expect(serialized(container).subtasks[0].excludedTargets).toEqual([rooms[1]!.id]);
    expect(within(applies).getByLabelText("Master Bathroom")).toBeChecked();
  });
  it("keeps applicability safely unavailable until the pending migration is applied", () => {
    render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="edit" kind="category" featuresAvailable={false}
      initialRoomIds={[rooms[0]!.id, rooms[1]!.id]} initialSubtasks={[{ id: null, title: "Clean shower" }]} />);
    expect(screen.getByText(/Checklist completion and Variants require the pending database migration/)).toBeVisible();
    expect(screen.queryByText("Applies to:")).not.toBeInTheDocument();
  });
  it("requires explicit combinations when rooms and local variants are both used", () => {
    const { container } = render(<ChoreForm action={action} rooms={rooms} initialValues={values} mode="create" kind="category"
      initialRoomIds={[rooms[0]!.id,rooms[1]!.id]} initialVariants={[{id:null,key:rooms[2]!.id,name:"Sheets"}]} />);
    expect(serialized(container).explicitTargets).toEqual([]);
    fireEvent.change(screen.getByLabelText("Target room"),{target:{value:rooms[0]!.id}});
    fireEvent.change(screen.getByLabelText("Target variant"),{target:{value:rooms[2]!.id}});
    fireEvent.click(screen.getByRole("button",{name:"Add target"}));
    expect(serialized(container).explicitTargets).toEqual([{roomId:rooms[0]!.id,variantKey:rooms[2]!.id}]);
  });
  it("keeps standalone editing available while the database migration is pending", () => {
    render(<ChoreForm action={action} rooms={[]} available={false} initialValues={values} mode="create" />);
    expect(screen.getByText(/pending database migration/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add subtask" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Chore name")).toBeInTheDocument();
    expect(screen.getByLabelText("Starts")).toBeInTheDocument();
  });
});
