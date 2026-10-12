import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoomManager } from "@/components/rooms/RoomManager";
vi.mock("@/actions/rooms", () => ({ saveRoomAction: vi.fn(), archiveRoomAction: vi.fn() }));
describe("RoomManager", () => {
  it("supports rename and confirms removal with history preservation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<RoomManager rooms={[{ id: "room-1", household_id: "home", name: "Master Bathroom", archived_at: null,
      created_at: "2026-10-12", updated_at: "2026-10-12" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Master Bathroom" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("All history will be kept"));
    fireEvent.click(screen.getByRole("button", { name: "Rename Master Bathroom" }));
    expect(screen.getByLabelText("Room name")).toHaveValue("Master Bathroom");
    expect(screen.getByLabelText("New room name")).toBeInTheDocument();
    confirm.mockRestore();
  });
});
