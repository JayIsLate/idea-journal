import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({
        error: "Missing env vars",
        hasUrl: !!url,
        hasKey: !!key,
      });
    }

    const supabase = getSupabase();
    const { data, error, count } = await supabase
      .from("entries")
      .select("id, title", { count: "exact" });

    return NextResponse.json({
      envUrl: url.substring(0, 30) + "...",
      queryError: error,
      count,
      entries: data,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      caught: err instanceof Error ? err.message : String(err),
    });
  }
}
