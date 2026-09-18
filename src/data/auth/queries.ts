import { cache } from "react";
import { createSupabaseServerClient } from "@/data/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error("We could not verify your sign-in right now.", { cause: error });
  }

  return data.user;
});
