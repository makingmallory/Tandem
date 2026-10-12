import { createSupabaseServerClient } from "@/data/supabase/server";

export async function createRoom(householdId: string, name: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from("rooms").insert({ household_id: householdId, name }).select().single();
}
export async function renameRoom(householdId: string, roomId: string, name: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from("rooms").update({ name }).eq("household_id", householdId).eq("id", roomId)
    .is("archived_at", null).select().single();
}
export async function archiveRoom(householdId: string, roomId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("archive_room", { p_household_id: householdId, p_room_id: roomId });
}
