import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import type { RoomRow } from "@/data/supabase/types";

// The migration is deliberately pending. Only a missing rooms table indicates
// an older schema; connection and authorization errors must still surface.
export const getRoomContext = cache(async (householdId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("rooms").select("*")
    .eq("household_id", householdId).order("name");
  if (error?.code === "PGRST205" || error?.code === "42P01") {
    return { available: false, rooms: [] as RoomRow[] };
  }
  if (error) throw new Error("We could not load your rooms.", { cause: error });
  return { available: true, rooms: data };
});
