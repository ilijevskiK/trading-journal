"use client";

import StockLetterPage from "@/components/canslim/StockLetterPage";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import LetterSection, { GrowthCell, formatDate, formatEps, formatMoney } from "@/components/canslim/LetterSection";
import FundamentalsChart from "@/components/FundamentalsChart";
import { analyzeCurrentEarnings, quarterComparisons, CURRENT_EARNINGS_RULES } from "@/lib/canslimC";

const CHART_QUARTERS = 12;

export default function CurrentEarningsPage() {
  return (
    <StockLetterPage
      path="/strategies/current-earnings"
      title="Current Earnings"
      intro="The “C” in CAN SLIM: is the latest quarter’s earnings growth big, speeding up, and backed by sales? From the company’s own filings with the SEC."
      related={LETTER_LINKS.filter((l) => l.letter !== "C")}
    >
      {(data) => <CurrentEarnings quarters={data.quarters} />}
    </StockLetterPage>
  );
}

function CurrentEarnings({ quarters }) {
  const result = analyzeCurrentEarnings(quarters);
  const history = quarterComparisons(quarters).slice(-CHART_QUARTERS);
  const r = CURRENT_EARNINGS_RULES;
  return (
    <LetterSection
      letter="C"
      title="Current quarterly earnings"
      rule={`EPS up ${r.minGrowthPct}%+ from the same quarter a year ago, ideally ${r.strongGrowthPct}%+ and speeding up, with sales up ${r.minSalesGrowthPct}%+ to back it.`}
      result={result}
    >
      {result.rows.length > 0 && <QuarterTable rows={result.rows} />}
      {history.length > 1 && <FundamentalsChart rows={history} minGrowthPct={r.minGrowthPct} />}
    </LetterSection>
  );
}

function QuarterTable({ rows }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-parchment-faint border-b border-line">
            <th className="pb-2 font-normal font-body">Quarter ended</th>
            <th className="pb-2 font-normal font-body text-right">EPS</th>
            <th className="pb-2 font-normal font-body text-right">Year ago</th>
            <th className="pb-2 font-normal font-body text-right">EPS growth</th>
            <th className="pb-2 font-normal font-body text-right">Sales</th>
            <th className="pb-2 font-normal font-body text-right">Sales growth</th>
            <th className="pb-2 font-normal font-body text-right">Net margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((q) => (
            <tr key={q.end} className="text-parchment-dim">
              <td className="py-2 font-body">
                {formatDate(q.end)}
                {q.derived && (
                  <span className="text-parchment-faint" title="Fiscal Q4, worked out as full year minus nine months">
                    {" "}
                    *
                  </span>
                )}
              </td>
              <td className={`py-2 text-right ${q.eps < 0 ? "text-loss-bright" : "text-parchment"}`}>{formatEps(q.eps)}</td>
              <td className="py-2 text-right">{formatEps(q.priorEps)}</td>
              <td className="py-2 text-right">
                {q.turnaround ? (
                  <span className="text-warn">turnaround</span>
                ) : (
                  <GrowthCell value={q.epsGrowth} threshold={CURRENT_EARNINGS_RULES.minGrowthPct} />
                )}
              </td>
              <td className="py-2 text-right">{formatMoney(q.revenue)}</td>
              <td className="py-2 text-right">
                <GrowthCell value={q.revenueGrowth} threshold={CURRENT_EARNINGS_RULES.minSalesGrowthPct} />
              </td>
              <td className="py-2 text-right">{q.netMargin == null ? "—" : `${q.netMargin.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some((q) => q.derived) && (
        <p className="text-[10px] text-parchment-faint mt-2">* Fiscal Q4, worked out as the full year minus the first nine months.</p>
      )}
    </div>
  );
}
