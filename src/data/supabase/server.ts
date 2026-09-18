import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/data/supabase/env";
import type { Database } from "@/data/supabase/types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The root proxy performs
          // refresh writes; Server Actions and Route Handlers can write here.
        }
      },
    },
  });
}
