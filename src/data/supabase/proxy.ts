import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/data/supabase/env";
import type { Database } from "@/data/supabase/types";

export async function updateSupabaseSession(request: NextRequest) {
  if (process.env.E2E_SHELL_TEST === "1" || !hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Keep this immediately after client creation. It validates/refreshes the
  // cookie rather than trusting unverified session contents.
  await supabase.auth.getClaims();

  return response;
}
