// Node-only — called from auth.js's jwt callback and the onboarding page/
// action, never from middleware.js or auth.config.js (edge runtime).

// Idempotent: safe to call on every sign-in, for both brand-new users and
// pre-existing ones that predate this table having a row for them.
export async function ensureUserSettingsRow(pool, userId) {
  await pool.query(
    "INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    [userId]
  );
}

export async function getOnboardingStatus(pool, userId) {
  const { rows } = await pool.query(
    "SELECT onboarding_completed FROM user_settings WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.onboarding_completed ?? false;
}
