import { createSupabaseServerClient } from "@/data/supabase/server";

export async function createHousehold(name: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("create_household", { household_name: name }).single();
}

export async function joinHousehold(inviteCode: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .rpc("join_household", { household_invite_code: inviteCode })
    .single();
}
