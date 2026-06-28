import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/allowlist";

// Handles the Google OAuth redirect: exchange the code for a session, enforce
// the invite allowlist, then route to the Write page.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Invite gate: anyone not on the allowlist gets signed out immediately.
  if (!isAllowed(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${siteUrl}/login?error=not-invited`);
  }

  // Land straight on the Write page.
  return NextResponse.redirect(`${siteUrl}/journal/write`);
}
