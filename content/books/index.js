import TheIntelligentInvestorContent, {
  meta as theIntelligentInvestorMeta,
} from "./the-intelligent-investor";
import TheCompleteTurtleTraderContent, {
  meta as theCompleteTurtleTraderMeta,
} from "./the-complete-turtletrader";
import HowToMakeMoneyInStocksContent, {
  meta as howToMakeMoneyInStocksMeta,
} from "./how-to-make-money-in-stocks";
import SecretsForProfitingContent, {
  meta as secretsForProfitingMeta,
} from "./secrets-for-profiting-in-bull-and-bear-markets";
import StageAnalysisModelBookContent, {
  meta as stageAnalysisModelBookMeta,
} from "./2024-stage-analysis-model-book";
import TradeLikeAStockMarketWizardContent, {
  meta as tradeLikeAStockMarketWizardMeta,
} from "./trade-like-a-stock-market-wizard";
import ThinkAndTradeLikeAChampionContent, {
  meta as thinkAndTradeLikeAChampionMeta,
} from "./think-and-trade-like-a-champion";
import MarketWizardsNextGenerationContent, {
  meta as marketWizardsNextGenerationMeta,
} from "./market-wizards-the-next-generation";
import MarketWizardsUpdatedContent, {
  meta as marketWizardsUpdatedMeta,
} from "./market-wizards-updated";
import UnknownMarketWizardsContent, {
  meta as unknownMarketWizardsMeta,
} from "./unknown-market-wizards";
import TheNewMarketWizardsContent, {
  meta as theNewMarketWizardsMeta,
} from "./the-new-market-wizards";
import TradingInTheZoneContent, {
  meta as tradingInTheZoneMeta,
} from "./trading-in-the-zone";

// Order here is the intended reading order (not alphabetical or add order) —
// see the reasoning behind the sequence in project notes. Add new books at
// the end unless they have a specific place in that sequence.
export const BOOKS = [
  { ...theIntelligentInvestorMeta, Content: TheIntelligentInvestorContent },
  { ...secretsForProfitingMeta, Content: SecretsForProfitingContent },
  { ...stageAnalysisModelBookMeta, Content: StageAnalysisModelBookContent },
  { ...howToMakeMoneyInStocksMeta, Content: HowToMakeMoneyInStocksContent },
  { ...tradeLikeAStockMarketWizardMeta, Content: TradeLikeAStockMarketWizardContent },
  { ...thinkAndTradeLikeAChampionMeta, Content: ThinkAndTradeLikeAChampionContent },
  { ...tradingInTheZoneMeta, Content: TradingInTheZoneContent },
  { ...marketWizardsUpdatedMeta, Content: MarketWizardsUpdatedContent },
  { ...theNewMarketWizardsMeta, Content: TheNewMarketWizardsContent },
  { ...unknownMarketWizardsMeta, Content: UnknownMarketWizardsContent },
  { ...marketWizardsNextGenerationMeta, Content: MarketWizardsNextGenerationContent },
  { ...theCompleteTurtleTraderMeta, Content: TheCompleteTurtleTraderContent },
];

export function getBook(slug) {
  return BOOKS.find((b) => b.slug === slug) || null;
}
