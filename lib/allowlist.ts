// Invite gate: only emails listed in ALLOWED_EMAILS (comma-separated) may use
// the app. The owner is always allowed even if omitted from the list. If
// ALLOWED_EMAILS is unset, nobody but the owner gets in (fail closed).
export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner && normalized === owner) return true;

  const allowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(normalized);
}
