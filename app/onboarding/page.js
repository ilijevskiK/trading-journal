import { redirect } from "next/navigation";
import { auth } from "@/auth";
import pool from "@/lib/db";
import { completeOnboarding } from "./actions";

const DEFAULTS = {
  account_size: 0,
  default_risk_percent: 1.5,
  max_position_percent_allowed: 20,
  twelve_data_api_key: "",
  finnhub_api_key: "",
};

export default async function OnboardingPage({ searchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { rows } = await pool.query(
    `SELECT account_size, default_risk_percent, max_position_percent_allowed,
            twelve_data_api_key, finnhub_api_key
     FROM user_settings WHERE user_id = $1`,
    [session.user.id]
  );
  const settings = rows[0] ?? DEFAULTS;
  const error = searchParams?.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink text-parchment font-body px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="font-display text-3xl tracking-wide text-gold-bright">Ledger</div>
          <div className="text-parchment-faint text-xs mt-1 tracking-wide uppercase">
            Trading Journal
          </div>
        </div>

        <form
          action={completeOnboarding}
          className="space-y-5 bg-surface border border-line rounded-lg p-6"
        >
          <p className="text-sm text-parchment-dim">
            One-time setup — this powers the price charts and position-size
            calculator throughout the app.
          </p>

          <Field
            label="Starting account size ($)"
            hint="You can log ongoing deposits later in Settings."
          >
            <input
              type="number"
              name="accountSize"
              defaultValue={settings.account_size}
              className={inputClass}
            />
          </Field>

          <Field label="Default risk per trade (%)" hint="Suggested: 1–2% of account.">
            <input
              type="number"
              step="0.1"
              name="defaultRiskPercent"
              defaultValue={settings.default_risk_percent}
              className={inputClass}
            />
          </Field>

          <Field
            label="Max position size (% of account)"
            hint="Trades sized above this get flagged on the discipline checklist."
          >
            <input
              type="number"
              step="1"
              name="maxPositionPercentAllowed"
              defaultValue={settings.max_position_percent_allowed}
              className={inputClass}
            />
          </Field>

          <Field
            label="Twelve Data API key (required)"
            hint={
              <>
                Powers price charts and the dashboard. Get a free key at{" "}
                <a
                  href="https://twelvedata.com/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-bright hover:underline"
                >
                  twelvedata.com
                </a>{" "}
                (free tier: 800 requests/day).
              </>
            }
          >
            <input
              type="text"
              name="twelveDataApiKey"
              defaultValue={settings.twelve_data_api_key || ""}
              placeholder="Paste your API key"
              className={inputClass + " font-mono"}
              autoComplete="off"
            />
          </Field>

          <Field
            label="Finnhub API key (optional)"
            hint="Adds live-updating watchlist charts. Skip this and add it later in Settings if you want."
          >
            <input
              type="text"
              name="finnhubApiKey"
              defaultValue={settings.finnhub_api_key || ""}
              placeholder="Paste your API key"
              className={inputClass + " font-mono"}
              autoComplete="off"
            />
          </Field>

          {error === "MissingApiKey" && (
            <p className="text-xs text-loss-bright">
              Enter your Twelve Data key to continue.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-gold text-ink px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gold-bright transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold-dim";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm text-parchment-dim mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-parchment-faint mt-1">{hint}</p>}
    </div>
  );
}
