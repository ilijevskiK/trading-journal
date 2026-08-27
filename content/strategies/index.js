import StageAnalysisStrategyContent, {
  meta as stageAnalysisMeta,
} from "./stage-analysis";
import {
  pineScript as stageAnalysisPine,
  license as stageAnalysisLicense,
} from "./pine-scripts/stage-analysis";
import EntryDisqualifierContent, {
  meta as entryDisqualifierMeta,
} from "./entry-disqualifier";
import {
  pineScript as entryDisqualifierPine,
  license as entryDisqualifierLicense,
} from "./pine-scripts/entry-disqualifier";

// Each entry pairs metadata (for the list page) with the write-up component
// (rendered on that strategy's detail page) and, where available, an
// accompanying Pine Script, so the detail page can offer an Explanation /
// Pine Script toggle. Add new strategies here.
export const STRATEGIES = [
  {
    ...stageAnalysisMeta,
    Content: StageAnalysisStrategyContent,
    pineScript: stageAnalysisPine,
    pineLicense: stageAnalysisLicense,
  },
  {
    ...entryDisqualifierMeta,
    Content: EntryDisqualifierContent,
    pineScript: entryDisqualifierPine,
    pineLicense: entryDisqualifierLicense,
  },
];

export function getStrategy(slug) {
  return STRATEGIES.find((s) => s.slug === slug) || null;
}
