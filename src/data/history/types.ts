import type { ActivityEventRow } from "@/data/supabase/types";

export type ActivityEvent = ActivityEventRow & {
  actor: { id: string; display_name: string; avatar_key: string | null } | null;
  chore: { id: string; name: string; icon_key: string; accent_key: string } | null;
};
