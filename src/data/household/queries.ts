import { cache } from "react";
import { getCurrentUser } from "@/data/auth/queries";
import { createSupabaseServerClient } from "@/data/supabase/server";
import type { HouseholdDetails } from "@/data/household/types";

export const getCurrentHousehold = cache(async (): Promise<HouseholdDetails | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error("We could not load your household membership.", { cause: membershipError });
  }

  if (!membership) return null;

  const [{ data: household, error: householdError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase
        .from("households")
        .select("id, name, invite_code, created_by, created_at")
        .eq("id", membership.household_id)
        .single(),
      supabase
        .from("household_members")
        .select("id, user_id, role, joined_at")
        .eq("household_id", membership.household_id)
        .order("joined_at", { ascending: true }),
    ]);

  if (householdError || membersError || !household) {
    throw new Error("We could not load your household.", {
      cause: householdError ?? membersError,
    });
  }

  const userIds = members.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_key")
    .in("id", userIds);

  if (profilesError) {
    throw new Error("We could not load your household members.", { cause: profilesError });
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const hydratedMembers = members.map((member) => {
    const profile = profilesById.get(member.user_id);
    if (!profile) throw new Error("A household member profile is missing.");
    return { ...member, profile };
  });

  return {
    ...household,
    currentUserRole: membership.role,
    members: hydratedMembers,
  };
});
