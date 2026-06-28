# Multi-User Setup

IDEA LOG was converted from single-user to multi-user with Google sign-in, per-user
data isolation (Postgres Row Level Security), an invite allowlist, and optional
bring-your-own-key (BYOK) for the Claude API. This file is the operator checklist for
turning it on. The code is already in place — these are the manual steps that live
outside the repo, plus how to verify it works.

---

## 1. Enable Google sign-in (Supabase dashboard)

1. Create a Google OAuth client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (Credentials → Create credentials → OAuth client ID → Web application).
2. Add these **Authorized redirect URIs** to the Google client:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (Supabase shows the exact value on the provider page in the next step.)
3. In the Supabase dashboard → **Authentication → Providers → Google**: enable it and
   paste the Google client ID + secret.
4. In **Authentication → URL Configuration**, set the Site URL and add redirect URLs:
   - `https://<your-domain>/auth/callback`
   - `http://localhost:3000/auth/callback`

---

## 2. Environment variables

Add these to `.env.local` (local) **and** the Vercel project settings (production).

```
# Already present — confirm these exist:
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
API_SECRET_KEY=...                 # used by the /api/entry ingest route + seed script

# New — required for multi-user:
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # Supabase "anon public" key (Project Settings → API)
NEXT_PUBLIC_SITE_URL=https://<your-domain>    # used to build the OAuth redirect
OWNER_EMAIL=jaymyers405@gmail.com  # your Google account; owns backfilled data + ingest
ALLOWED_EMAILS=friend1@gmail.com,friend2@gmail.com   # comma-separated invite list
```

Notes:
- `ALLOWED_EMAILS` is the invite gate. Anyone can click "Sign in with Google," but only
  emails on this list (plus `OWNER_EMAIL`, always allowed) get in — others see a
  "not invited" screen. If `ALLOWED_EMAILS` is empty, only the owner can sign in.
- `NEXT_PUBLIC_*` vars are exposed to the browser (that's expected for the anon key and
  site URL). The anon key is safe to expose — RLS is what protects the data.

---

## 3. Run the database migration

Open `supabase/migration-multiuser.sql` and run it in the Supabase **SQL Editor** in
three passes (the file is commented to make the order explicit):

1. **Schema + RLS first.** Run sections **1–6** (profiles + trigger, `user_id` columns,
   per-user `day_number` uniqueness, RLS policies, indexes).
2. **Sign in once.** Go to the app and sign in with Google as the owner. This creates
   your `auth.users` row and `profiles` row, which the backfill needs.
3. **Backfill.** Uncomment and run section **7** — it assigns every existing entry,
   idea, synthesis, and writing row to your account. Then verify your journal looks
   intact in the app.
4. **Lock it down.** Once verified, uncomment and run section **8** (`set ... not null`)
   so future rows can't be created without an owner.

> The migration is idempotent where it matters (`if not exists`, `drop policy if
> exists`), so re-running sections 1–6 is safe.

---

## 4. Verify end-to-end

1. **Auth round-trip.** Visit `/` while signed out → you're redirected to `/login`.
   Sign in with Google → first time lands on `/onboarding`, after that on `/journal`.
   Sign out from the account menu (top-right avatar) → back to `/login`.
2. **Invite gate.** Sign in with an email **not** on `ALLOWED_EMAILS` → "not invited"
   screen, signed out.
3. **Your data.** Signed in as the owner, confirm backfilled entries appear. Submit a
   new transcription → it processes (Claude extraction) and is owned by you.
4. **Isolation.** Sign in with a second test Google account (add it to `ALLOWED_EMAILS`
   first). It sees an empty journal, can create its own entries, and **cannot** see the
   owner's. Cross-check with a `select * from entries` in the SQL editor as the service
   role to confirm rows carry distinct `user_id`s.
5. **Hermes + writing.** Open an entry, run Hermes annotations (streams), reply in a
   thread; open a writing doc, confirm autosave + chat work.
6. **BYOK.** In Settings, paste an Anthropic key, submit an entry (now billed to that
   key). Remove it → processing falls back to the shared `ANTHROPIC_API_KEY`.
7. **Day numbering.** Each account's `day_number` starts at 1 independently.

---

## How it works (reference)

- **Per-user isolation** is enforced by Postgres RLS. Every user-owned table
  (`entries`, `ideas`, `syntheses`, `idea_writing`, `writing_conversations`) has a
  `user_id` and a policy `auth.uid() = user_id`. App routes use a cookie-bound,
  user-scoped Supabase client (`lib/supabase/server.ts` → `getServerSupabase` /
  `requireUser`), so the database filters rows automatically.
- **Privacy:** there is no public sharing. Every journal is visible only to its owner.
- **The service-role client** (`lib/supabase/admin.ts`, bypasses RLS) is used in exactly
  two places: the `x-api-key` ingest route (`/api/entry`) and the node scripts
  (`scripts/check.ts`, `scripts/clear.ts`) — both owner-scoped via `OWNER_EMAIL`.
- **BYOK** keys are stored in `profiles.anthropic_key`, protected by RLS so only the
  owning user (or the service role) can read them. They are stored in plaintext, which
  is acceptable for a small circle of trusted users. If this ever opens to untrusted
  users, encrypt them at rest via Supabase Vault.

---

## Adding / removing friends later

Edit `ALLOWED_EMAILS` (in `.env.local` and Vercel) and redeploy. Removing an email
blocks future sign-ins but does not delete their existing data — to fully remove a user,
delete them from **Authentication → Users** in the Supabase dashboard (the
`on delete cascade` foreign keys remove their rows).
