"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SiteNav from "@/components/SiteNav";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setHasKey(Boolean(d.hasKey));
        setKeyPreview(d.keyPreview ?? null);
      })
      .catch(() => {});
  }, []);

  async function saveKey() {
    setSaving(true);
    setSavedMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anthropic_key: keyInput }),
    });
    setSaving(false);
    if (res.ok) {
      const trimmed = keyInput.trim();
      setHasKey(trimmed.length > 0);
      setKeyPreview(trimmed ? `…${trimmed.slice(-4)}` : null);
      setKeyInput("");
      setSavedMsg(trimmed ? "Key saved." : "Key removed.");
    } else {
      setSavedMsg("Couldn't save — try again.");
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const name = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const email = user?.email ?? "";

  return (
    <>
      <SiteNav contextLabel="SETTINGS" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-12">
        <div className="mb-6">
          <h1 className="font-mono text-2xl sm:text-[26px] font-bold">Settings</h1>
        </div>

        {/* Profile */}
        <section className="mb-8">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-secondary mb-3">
            Profile
          </h2>
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bg font-mono text-sm text-secondary">
                {(name || email || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm text-text truncate">{name || "—"}</p>
              <p className="text-xs text-secondary truncate">{email}</p>
            </div>
          </div>
        </section>

        {/* BYOK */}
        <section className="mb-8">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-secondary mb-3">
            Claude API key
          </h2>
          <p className="text-sm text-secondary mb-3 leading-relaxed">
            Bring your own Claude API key. If set, your entries are processed
            using your key instead of the shared one. Optional.
          </p>
          {hasKey && (
            <p className="text-xs text-text mb-2 font-mono">
              Current key: {keyPreview}
            </p>
          )}
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={hasKey ? "Enter a new key to replace…" : "sk-ant-…"}
            className="block w-full text-base font-mono bg-card border border-border rounded-xl px-4 py-3 text-text placeholder:text-secondary focus:outline-none focus:border-accent"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={saveKey}
              disabled={saving || keyInput.trim().length === 0}
              className="font-mono text-sm font-medium uppercase tracking-wider bg-accent text-white rounded-xl px-5 h-[44px] active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
            >
              {saving ? "Saving…" : "Save key"}
            </button>
            {hasKey && (
              <button
                onClick={() => {
                  setKeyInput("");
                  fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ anthropic_key: "" }),
                  }).then((r) => {
                    if (r.ok) {
                      setHasKey(false);
                      setKeyPreview(null);
                      setSavedMsg("Key removed.");
                    }
                  });
                }}
                className="font-mono text-sm uppercase tracking-wider text-secondary hover:text-accent"
              >
                Remove
              </button>
            )}
            {savedMsg && (
              <span className="text-xs text-secondary">{savedMsg}</span>
            )}
          </div>
        </section>

        {/* Sign out */}
        <section>
          <button
            onClick={signOut}
            className="font-mono text-sm font-medium uppercase tracking-wider border border-border rounded-xl px-5 h-[44px] text-text hover:border-accent hover:text-accent transition-colors"
          >
            Sign out
          </button>
        </section>
      </div>
    </>
  );
}
