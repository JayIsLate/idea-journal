import type { SupabaseClient } from "@supabase/supabase-js";

// Bring-your-own-key: returns the user's stored Anthropic key, or undefined to
// fall back to the shared ANTHROPIC_API_KEY env var (the Anthropic SDK reads
// that automatically when constructed with apiKey: undefined). Optional per
// user — most run on the shared key.
export async function getUserApiKey(
  supabase: SupabaseClient,
  userId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from("profiles")
    .select("anthropic_key")
    .eq("id", userId)
    .single();
  const key = data?.anthropic_key?.trim();
  return key ? key : undefined;
}
