import { createSupabaseServerClient } from "@/data/supabase/server";

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName },
    },
  });
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutCurrentUser() {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signOut();
}

export async function updateCurrentUserPassword(password: string) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { data: null, error: userError ?? new Error("Authentication is required.") };
  }

  return supabase.auth.updateUser({ password });
}
