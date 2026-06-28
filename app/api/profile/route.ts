import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — return the user's settings + whether a BYOK key is set (never the key
// itself, only a masked preview).
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("anthropic_key, settings")
    .eq("id", user.id)
    .single();

  const key = data?.anthropic_key?.trim() || "";
  return NextResponse.json({
    hasKey: key.length > 0,
    keyPreview: key ? `…${key.slice(-4)}` : null,
    settings: data?.settings ?? {},
  });
}

// PATCH — update the BYOK key and/or merge settings. Pass anthropic_key: "" to
// clear it.
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    anthropic_key?: string;
    settings?: Record<string, unknown>;
  };

  const updates: Record<string, unknown> = {};

  if (body.anthropic_key !== undefined) {
    const trimmed = body.anthropic_key.trim();
    updates.anthropic_key = trimmed.length > 0 ? trimmed : null;
  }

  if (body.settings !== undefined) {
    // Merge so we don't clobber other settings keys (e.g. onboarding_complete).
    const { data: existing } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single();
    updates.settings = { ...(existing?.settings ?? {}), ...body.settings };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
