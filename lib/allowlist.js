// Checked from auth.js's signIn callback before a sign-in (magic-link
// request or OAuth callback) is allowed to complete. Anyone not on the list
// is rejected before an account is ever created — see db/0001_init_auth.sql
// for the allowed_emails table and ROADMAP.md Phase 3.1 for why this exists.
export async function isEmailAllowed(pool, email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query(
    "SELECT 1 FROM allowed_emails WHERE email = $1",
    [normalized]
  );
  return rows.length > 0;
}
