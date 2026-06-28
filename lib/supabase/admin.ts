import { createClient } from "@supabase/supabase-js";

// Service-role client that BYPASSES RLS. Use ONLY for callers with no browser
// session: the x-api-key ingest route (app/api/entry) and the node scripts.
// Everything else must use the user-scoped getServerSupabase() so RLS applies.
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

// Resolve the owner's auth.users id by email (OWNER_EMAIL). Used by the ingest
// route and scripts to stamp owner-owned rows. Requires the service-role key
// (auth admin API). Returns null if the owner hasn't signed in yet.
export async function getOwnerUserId(): Promise<string | null> {
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  if (!ownerEmail) throw new Error("Missing OWNER_EMAIL environment variable");

  const supabase = getAdminSupabase();
  // listUsers is paginated; the owner is one of the first users, so a single
  // large page is plenty for this single-owner lookup.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Failed to list users: ${error.message}`);

  const owner = data.users.find(
    (u) => u.email?.toLowerCase() === ownerEmail
  );
  return owner?.id ?? null;
}
