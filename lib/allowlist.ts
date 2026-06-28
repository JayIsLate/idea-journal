import { getAdminSupabase } from "@/lib/supabase/admin";

// Invite gate. An email is allowed if it is the owner, is listed in the
// ALLOWED_EMAILS env var (legacy/fallback), or has a row in the allowed_emails
// table. The table is the easy path — add a friend by inserting one row in the
// Supabase Table Editor (no redeploy). Checked server-side (auth callback) with
// the service-role client, since the table is private (RLS, no policies).
export async function isAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // Owner is always allowed.
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner && normalized === owner) return true;

  // Env fallback (kept so anyone already in ALLOWED_EMAILS still works).
  const envAllowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envAllowed.includes(normalized)) return true;

  // Database allowlist.
  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase
      .from("allowed_emails")
      .select("email")
      .eq("email", normalized)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
