import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";
import type { Chore } from "@/data/chores/types";
import { getRoomContext } from "@/data/rooms/queries";

export const getChores = cache(async (householdId: string): Promise<Chore[]> => {
  const supabase = await createSupabaseServerClient();
  const { available } = await getRoomContext(householdId);
  let query = supabase
    .from("chores")
    .select("*")
    .eq("household_id", householdId)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });
  if (available) query = query.is("retired_at", null);
  const { data, error } = await query;

  if (error) throw new Error("We could not load your chores.", { cause: error });
  return data;
});

export const getChore = cache(
  async (householdId: string, choreId: string): Promise<Chore | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chores")
      .select("*")
      .eq("household_id", householdId)
      .eq("id", choreId)
      .maybeSingle();

    if (error) throw new Error("We could not load this chore.", { cause: error });
    return data;
  },
);
