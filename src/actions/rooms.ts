"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formErrorState, successState, validationErrorState, type ActionState } from "@/actions/state";
import { createRoom, renameRoom, archiveRoom } from "@/data/rooms/mutations";
import { getCurrentHousehold } from "@/data/household/queries";

const roomName = z.object({ name: z.string().trim().min(1, "Give this room a name.").max(60, "Use at most 60 characters.") });
function roomError(code?: string) {
  return code === "23505" ? "That room name is already in use." : "We could not save this room. Please try again.";
}
function refreshRooms() { revalidatePath("/", "layout"); }
export async function saveRoomAction(roomId: string | null, _state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = roomName.safeParse({ name: formData.get("name") });
  if (!parsed.success) return validationErrorState(parsed.error.flatten().fieldErrors);
  const home = await getCurrentHousehold();
  if (!home) return formErrorState("Please sign in and join a household first.");
  const result = roomId ? await renameRoom(home.id, roomId, parsed.data.name) : await createRoom(home.id, parsed.data.name);
  if (result.error) return formErrorState(roomError(result.error.code));
  refreshRooms();
  return successState(roomId ? "Room renamed." : "Room added.");
}
export async function archiveRoomAction(roomId: string, _state: ActionState, _form: FormData): Promise<ActionState> {
  void _state; void _form;
  const home = await getCurrentHousehold();
  if (!home) return formErrorState("Please sign in and join a household first.");
  const { error } = await archiveRoom(home.id, roomId);
  if (error) return formErrorState(roomError(error.code));
  refreshRooms();
  return successState("Room removed. Its history is kept.");
}
