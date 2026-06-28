"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [signingIn, setSigningIn] = useState(false);
  const notInvited = searchParams.get("error") === "not-invited";

  // If already authenticated, leave the login page.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) window.location.href = "/journal/write";
    });
  }, []);

  async function signIn() {
    setSigningIn(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) setSigningIn(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">
          IDEA LOG<span className="text-accent">·</span>
        </h1>
        <p className="text-sm text-secondary mt-3 leading-relaxed">
          Capture ideas from voice memos or writing, processed with AI and
          archived in a browsable journal.
        </p>

        {notInvited && (
          <p className="text-sm text-accent mt-6 leading-relaxed">
            That account isn&rsquo;t on the invite list. Ask Jay to add your
            email, then try again.
          </p>
        )}

        <button
          onClick={signIn}
          disabled={signingIn}
          className="mt-8 w-full font-mono text-sm font-medium uppercase tracking-wider bg-accent text-white rounded-xl px-4 h-[52px] active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
        >
          {signingIn ? "Redirecting…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
