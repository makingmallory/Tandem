import type { HouseholdMemberRow, HouseholdRow, ProfileRow } from "@/data/supabase/types";

export type HouseholdMember = Pick<HouseholdMemberRow, "id" | "user_id" | "role" | "joined_at"> & {
  profile: Pick<ProfileRow, "id" | "display_name" | "avatar_key">;
};

export type HouseholdDetails = Pick<
  HouseholdRow,
  "id" | "name" | "invite_code" | "created_by" | "created_at"
> & {
  currentUserRole: HouseholdMemberRow["role"];
  members: HouseholdMember[];
};
