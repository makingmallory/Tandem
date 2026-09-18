import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/data/supabase/env";
import type { Database } from "@/data/supabase/types";

export function createSupabaseBrowserClient() {
  const { url, key } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, key);
}
