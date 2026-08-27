// Timeframes offered on the fullscreen chart. lookbackDays is sized to stay
// comfortably under Twelve Data's ~5,000-bars-per-request cap for each
// interval's typical bar density — 1H/4H get a much shorter window than
// 1D/1W, which can each cover this app's full multi-year history.
export const TIMEFRAMES = [
  { key: "1h", label: "1H", lookbackDays: 2 * 365 },
  { key: "4h", label: "4H", lookbackDays: 5 * 365 },
  { key: "1day", label: "1D", lookbackDays: 18 * 365 },
  { key: "1week", label: "1W", lookbackDays: 18 * 365 },
];

export function lookbackDaysFor(interval) {
  return TIMEFRAMES.find((t) => t.key === interval)?.lookbackDays ?? 18 * 365;
}
