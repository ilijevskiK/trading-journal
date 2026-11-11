// Single source of truth for default account settings — imported by
// TradesContext.js (no-session short-circuit) and lib/tradesDb.js
// (resetAll), so the values can't drift between the two.
export const DEFAULT_SETTINGS = {
  accountSize: 10000,
  defaultRiskPercent: 1.5,
  maxPositionPercentAllowed: 20,
  twelveDataApiKey: "",
  finnhubApiKey: "",
};
