"use client";

import StockLetterPage from "@/components/canslim/StockLetterPage";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import LetterSection, { GrowthCell, formatDate, formatEps } from "@/components/canslim/LetterSection";
import AnnualEarningsChart from "@/components/AnnualEarningsChart";
import { analyzeAnnualEarnings, annualComparisons, ANNUAL_EARNINGS_RULES } from "@/lib/canslimA";

const CHART_YEARS = 6;

export default function AnnualEarningsPage() {
  return (
    <StockLetterPage
      path="/strategies/annual-earnings"
      title="Annual Earnings"
      intro="The “A” in CAN SLIM: has the company grown earnings strongly every year for the last three, with a high return on equity? From the company’s own filings with the SEC."
      related={LETTER_LINKS.filter((l) => l.letter !== "A")}
    >
      {(data) => <AnnualEarnings years={data.years} />}
    </StockLetterPage>
  );
}

function AnnualEarnings({ years }) {
  const result = analyzeAnnualEarnings(years);
  const history = annualComparisons(years).slice(-CHART_YEARS);
  const r = ANNUAL_EARNINGS_RULES;
  return (
    <LetterSection
      letter="A"
      title="Annual earnings growth"
      rule={`EPS up in each of the last ${r.years} years, growing ${r.minGrowthPct}%+ a year (ideally ${r.strongGrowthPct}%+), with return on equity of ${r.minRoePct}%+.`}
      result={result}
    >
      {result.rows.length > 0 && <AnnualTable rows={result.rows} />}
      {history.length > 1 && <AnnualEarningsChart rows={history} />}
    </LetterSection>
  );
}

function AnnualTable({ rows }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-parchment-faint border-b border-line">
            <th className="pb-2 font-normal font-body">Fiscal year ended</th>
            <th className="pb-2 font-normal font-body text-right">EPS</th>
            <th className="pb-2 font-normal font-body text-right">EPS growth</th>
            <th className="pb-2 font-normal font-body text-right">Return on equity</th>
            <th className="pb-2 font-normal font-body text-right">Cash flow ÷ earnings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((y, i) => {
            const isBase = i === rows.length - 1;
            return (
              <tr key={y.end} className={isBase ? "text-parchment-faint" : "text-parchment-dim"}>
                <td className="py-2 font-body">
                  {formatDate(y.end)}
                  {isBase && <span className="text-parchment-faint"> (base)</span>}
                </td>
                <td className={`py-2 text-right ${y.eps < 0 ? "text-loss-bright" : "text-parchment"}`}>{formatEps(y.eps)}</td>
                <td className="py-2 text-right">
                  {isBase ? (
                    <span className="text-parchment-faint">—</span>
                  ) : (
                    <GrowthCell value={y.epsGrowth} threshold={ANNUAL_EARNINGS_RULES.minGrowthPct} />
                  )}
                </td>
                <td className="py-2 text-right">
                  {y.negativeEquity ? (
                    <span className="text-parchment-faint">negative equity</span>
                  ) : y.roe == null ? (
                    "—"
                  ) : (
                    <span className={y.roe >= ANNUAL_EARNINGS_RULES.minRoePct ? "text-gain-bright" : "text-parchment-dim"}>
                      {y.roe.toFixed(0)}%
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">{y.cashFlowRatio == null ? "—" : `${y.cashFlowRatio.toFixed(1)}×`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
