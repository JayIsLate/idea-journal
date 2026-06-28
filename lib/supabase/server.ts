import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// Cookie-bound, user-scoped Supabase client for route handlers and server
// components. Uses the anon key + the request's auth cookie, so Postgres RLS
// enforces per-user isolation automatically. This is the workhorse client —
// it replaces the old service-role getSupabase() everywhere except the
// x-api-key ingest route and the node scripts (see lib/supabase/admin.ts).
export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // `setAll` is called from Server Components where cookies are
          // read-only. The middleware refreshes the session, so this is safe
          // to ignore here.
        }
      },
    },
  });
}

// Resolve the authenticated user. Always use getUser() (validates the JWT with
// the auth server) inside route handlers — never getSession(). Returns the
// user-scoped client alongside the user so callers don't build it twice.
export async function requireUser(): Promise<
  { supabase: SupabaseClient; user: User } | { supabase: SupabaseClient; user: null }
> {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
