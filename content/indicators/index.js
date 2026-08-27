import SmartMoneyConceptsContent, {
  meta as smartMoneyConceptsMeta,
} from "./smart-money-concepts";
import WaveTrendOscillatorContent, {
  meta as waveTrendOscillatorMeta,
} from "./wavetrend-oscillator";
import SqueezeMomentumContent, {
  meta as squeezeMomentumMeta,
} from "./squeeze-momentum";
import AlphaTrendContent, { meta as alphaTrendMeta } from "./alphatrend";
import VwapContent, { meta as vwapMeta } from "./vwap";
import AtrContent, { meta as atrMeta } from "./atr";

import {
  pineScript as smartMoneyConceptsPine,
  license as smartMoneyConceptsLicense,
} from "./pine-scripts/smart-money-concepts";
import {
  pineScript as waveTrendOscillatorPine,
  license as waveTrendOscillatorLicense,
} from "./pine-scripts/wavetrend-oscillator";
import {
  pineScript as squeezeMomentumPine,
  license as squeezeMomentumLicense,
} from "./pine-scripts/squeeze-momentum";
import {
  pineScript as alphaTrendPine,
  license as alphaTrendLicense,
} from "./pine-scripts/alphatrend";

// Each entry pairs metadata (for the list page) with the write-up component
// (rendered on that indicator's detail page) and, where available, the
// indicator's real published Pine Script source + license info, so the
// detail page can offer an Explanation / Pine Script toggle. Add new
// indicators here.
export const INDICATORS = [
  {
    ...smartMoneyConceptsMeta,
    Content: SmartMoneyConceptsContent,
    pineScript: smartMoneyConceptsPine,
    pineLicense: smartMoneyConceptsLicense,
  },
  {
    ...waveTrendOscillatorMeta,
    Content: WaveTrendOscillatorContent,
    pineScript: waveTrendOscillatorPine,
    pineLicense: waveTrendOscillatorLicense,
  },
  {
    ...squeezeMomentumMeta,
    Content: SqueezeMomentumContent,
    pineScript: squeezeMomentumPine,
    pineLicense: squeezeMomentumLicense,
  },
  {
    ...alphaTrendMeta,
    Content: AlphaTrendContent,
    pineScript: alphaTrendPine,
    pineLicense: alphaTrendLicense,
  },
  {
    ...vwapMeta,
    Content: VwapContent,
  },
  {
    ...atrMeta,
    Content: AtrContent,
  },
];

export function getIndicator(slug) {
  return INDICATORS.find((i) => i.slug === slug) || null;
}
