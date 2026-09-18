export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and a publishable or anon key to .env.local.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

export function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new SupabaseConfigurationError();
  }

  return { url, key };
}
