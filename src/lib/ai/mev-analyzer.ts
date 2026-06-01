export interface MevRiskProfile {
  vulnerabilityScore: number; // 0-100
  sandwichRisk: boolean;
  frontrunRisk: boolean;
  recommendation: string;
}

export function evaluateMevRisk(quoteData: Record<string, unknown>): MevRiskProfile {
  const MIN_USD_THRESHOLD = 50;
  // Trades above this notional are attractive enough to be worth sandwiching.
  const LARGE_TRADE_USD = 10_000;
  const tradeUsdValue = Number(quoteData.usdValue || quoteData.fromTokenAmountUsd || 0);
  
  if (tradeUsdValue < MIN_USD_THRESHOLD) {
    return { 
      vulnerabilityScore: 10, 
      sandwichRisk: false,
      frontrunRisk: false,
      recommendation: "Safe to trade. Minor slippage acceptable.", 
    };
  }

  // A deterministic mock evaluating standard EVM swap quotes for MEV vulnerabilities
  const priceImpact = Number(quoteData.estimatedPriceImpact || 0);
  const slippage = Number(quoteData.slippage || 1); // standard 1% default

  let vulnerabilityScore = 0;
  let sandwichRisk = false;
  let frontrunRisk = false;

  if (priceImpact > 2.0) {
    vulnerabilityScore += 40;
    frontrunRisk = true;
  }

  if (slippage > 1.0) {
    vulnerabilityScore += 30;
    sandwichRisk = true;
  }

  // Large trades are generally more susceptible — judge by USD notional, not by
  // the digit-length of the raw wei amount (which depends on token decimals).
  if (tradeUsdValue > LARGE_TRADE_USD) {
    vulnerabilityScore += 30;
  }

  let recommendation = "Low MEV risk. Safe to execute on public mempool.";
  if (vulnerabilityScore > 75) {
    recommendation = "CRITICAL MEV RISK: Use Flashbots RPC or an MEV-blocker to execute this trade.";
  } else if (vulnerabilityScore > 40) {
    recommendation = "High MEV risk: Consider lowering slippage tolerance or splitting the trade.";
  }

  return {
    vulnerabilityScore,
    sandwichRisk,
    frontrunRisk,
    recommendation
  };
}
