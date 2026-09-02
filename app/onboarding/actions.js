"use server";

import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import pool from "@/lib/db";

export async function completeOnboarding(formData) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const twelveDataApiKey = (formData.get("twelveDataApiKey") || "").toString().trim();
  if (!twelveDataApiKey) redirect("/onboarding?error=MissingApiKey");

  const finnhubApiKey = (formData.get("finnhubApiKey") || "").toString().trim();
  const accountSize = parseFloat(formData.get("accountSize")) || 0;
  const defaultRiskPercent = parseFloat(formData.get("defaultRiskPercent")) || 0;
  const maxPositionPercentAllowed = parseFloat(formData.get("maxPositionPercentAllowed")) || 0;

  // Upsert, not a plain UPDATE: a session that predates this table having a
  // row for its user (e.g. anyone who signed in before this phase shipped)
  // never passes through the jwt callback's trigger === "signIn" branch
  // again to get one created — an UPDATE against a nonexistent row silently
  // affects zero rows with no error, so this has to be able to create the
  // row itself rather than assume ensureUserSettingsRow already ran.
  await pool.query(
    `INSERT INTO user_settings
       (user_id, account_size, default_risk_percent, max_position_percent_allowed,
        twelve_data_api_key, finnhub_api_key, onboarding_completed, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, now())
     ON CONFLICT (user_id) DO UPDATE SET
       account_size = EXCLUDED.account_size,
       default_risk_percent = EXCLUDED.default_risk_percent,
       max_position_percent_allowed = EXCLUDED.max_position_percent_allowed,
       twelve_data_api_key = EXCLUDED.twelve_data_api_key,
       finnhub_api_key = EXCLUDED.finnhub_api_key,
       onboarding_completed = true,
       updated_at = now()`,
    [
      session.user.id,
      accountSize,
      defaultRiskPercent,
      maxPositionPercentAllowed,
      twelveDataApiKey,
      finnhubApiKey || null,
    ]
  );

  // Rewrites the session cookie in this same response so the middleware
  // gate lifts immediately — no sign-out/sign-in, no SessionProvider needed.
  await unstable_update({ user: { onboardingCompleted: true } });

  redirect("/");
}
