// CAN SLIM "S" — supply and demand: is volume heavier on up days than down
// days (buyers in control), is the company shrinking its share count rather
// than issuing more, and is debt modest? Candles are completed daily bars
// (oldest first); `supply` comes from extractSupplyFinancials.

export const SUPPLY_DEMAND_RULES = {
  volumeSessions: 50,
  strongUpDownRatio: 1.5,
  minUpDownRatio: 1.0,
  failUpDownRatio: 0.8,
  buybackPct: -1, // share count down at least this much counts as buying back
  dilutionPct: 5, // share count up more than this is dilution
  lowDebtToEquity: 0.5,
  highDebtToEquity: 1.0,
};

export function upDownVolume(candles, sessions) {
  const recent = candles.slice(-(sessions + 1));
  let up = 0;
  let down = 0;
  let upDays = 0;
  let downDays = 0;
  for (let i = 1; i < recent.length; i++) {
    const v = recent[i].volume;
    if (v == null) continue;
    if (recent[i].close > recent[i - 1].close) {
      up += v;
      upDays++;
    } else if (recent[i].close < recent[i - 1].close) {
      down += v;
      downDays++;
    }
  }
  return { ratio: down > 0 ? up / down : null, upDays, downDays, sessions: recent.length - 1 };
}

function compactShares(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} million`;
  return n.toLocaleString();
}

export function analyzeSupplyDemand(candles, supply, rules = SUPPLY_DEMAND_RULES) {
  const reasons = [];
  let verdict = null;
  const order = ["strong", "pass", "warning", "fail"];
  const worse = (v) => {
    if (verdict == null || order.indexOf(v) > order.indexOf(verdict)) verdict = v;
  };

  const volume = candles.length > rules.volumeSessions ? upDownVolume(candles, rules.volumeSessions) : null;
  if (volume?.ratio != null) {
    const r = volume.ratio;
    const detail = `${r.toFixed(2)}× as much volume on up days as down days over the last ${volume.sessions} sessions`;
    if (r >= rules.minUpDownRatio) {
      worse("pass");
      reasons.push({ level: "pass", text: r >= rules.strongUpDownRatio ? `Heavy buying: ${detail}.` : `Buyers in control: ${detail}.` });
    } else if (r >= rules.failUpDownRatio) {
      worse("warning");
      reasons.push({ level: "warning", text: `Sellers slightly ahead: ${detail}.` });
    } else {
      worse("fail");
      reasons.push({ level: "fail", text: `Under distribution: ${detail}. Institutions look to be selling.` });
    }
  } else {
    reasons.push({ level: "info", text: "Not enough price and volume history to judge buying vs selling." });
  }

  const sharesChange = supply?.shares ? ((supply.shares.now - supply.shares.yearAgo) / supply.shares.yearAgo) * 100 : null;
  if (sharesChange != null) {
    if (sharesChange <= rules.buybackPct) {
      reasons.push({
        level: "pass",
        text: `Share count down ${Math.abs(sharesChange).toFixed(1)}% from a year ago: the company is buying back stock, shrinking supply.`,
      });
    } else if (sharesChange > rules.dilutionPct) {
      worse("warning");
      reasons.push({
        level: "warning",
        text: `Share count up ${sharesChange.toFixed(1)}% from a year ago: new shares are diluting existing holders and adding supply.`,
      });
    } else {
      reasons.push({ level: "info", text: `Share count roughly flat (${sharesChange >= 0 ? "+" : ""}${sharesChange.toFixed(1)}% vs a year ago).` });
    }
    reasons.push({
      level: "info",
      text: `About ${compactShares(supply.shares.now)} shares. Any size can work, but fewer shares take less buying to move.`,
    });
  }

  const debt = supply?.debt?.value ?? null;
  const equity = supply?.equity?.value ?? null;
  let debtToEquity = null;
  if (debt != null && equity != null) {
    if (equity <= 0) {
      reasons.push({ level: "info", text: "Shareholders' equity is negative, so debt-to-equity isn't meaningful." });
    } else {
      debtToEquity = debt / equity;
      const trend =
        supply.debtYearAgo != null && supply.debtYearAgo > 0
          ? debt < supply.debtYearAgo * 0.95
            ? ", and falling"
            : debt > supply.debtYearAgo * 1.05
              ? ", and rising"
              : ""
          : "";
      if (debtToEquity > rules.highDebtToEquity) {
        worse("warning");
        reasons.push({ level: "warning", text: `High debt: ${debtToEquity.toFixed(2)}× equity${trend}.` });
      } else {
        reasons.push({
          level: debtToEquity <= rules.lowDebtToEquity ? "pass" : "info",
          text: `Debt is ${debtToEquity.toFixed(2)}× equity${trend}${debtToEquity <= rules.lowDebtToEquity ? ": modest" : ""}.`,
        });
      }
    }
  } else if (equity != null) {
    reasons.push({ level: "info", text: "No long-term debt figure found in the filings." });
  }

  if (
    verdict === "pass" &&
    volume.ratio >= rules.strongUpDownRatio &&
    (sharesChange == null || sharesChange <= rules.dilutionPct) &&
    (debtToEquity == null || debtToEquity <= rules.lowDebtToEquity)
  ) {
    verdict = "strong";
  }

  return { verdict, reasons, stats: { volume, sharesChange, debtToEquity } };
}
