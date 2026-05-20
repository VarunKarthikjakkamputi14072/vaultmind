export interface RiskProfile {
  score: number; // 0 to 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
}

export function evaluatePortfolioRisk(tokens: Record<string, unknown>[]): RiskProfile {
  let score = 0;
  const factors: string[] = [];

  const validTokens = tokens.filter(t => t.possible_spam !== true && Number(t.usd_value) > 0);
  const spamTokens = tokens.filter(t => t.possible_spam === true || !t.usd_value || Number(t.usd_value) === 0);

  if (spamTokens.length > 0) {
    score += Math.min(spamTokens.length * 5, 30); // Cap at 30 points
    factors.push(`Detected ${spamTokens.length} unpriced or suspected spam tokens (highly illiquid).`);
  }

  // Simple rule-based risk evaluation for demonstration
  const totalValue = validTokens.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0);
  
  if (totalValue > 0) {
    // Recognised stablecoins — expanded beyond USDC/USDT/DAI to include
    // algorithmic (FRAX), institutional (PYUSD) and overcollateralised (LUSD) variants.
    // This prevents misclassifying diverse stable strategies as high-risk.
    const STABLECOINS = ['USDC', 'USDT', 'DAI', 'FRAX', 'PYUSD', 'LUSD', 'USDS', 'GHO'];
    
    // Scoring thresholds derived from portfolio theory literature:
    // LOW (0-25): diversified, stable-backed, low concentration
    // MEDIUM (25-50): moderate exposure, some concentration risk
    // HIGH (50-75): significant single-asset or low-liquidity exposure  
    // CRITICAL (75+): extreme concentration, high illiquidity, or spam token dominance
    const THRESHOLDS = { MEDIUM: 25, HIGH: 50, CRITICAL: 75 } as const;
    const stableValue = tokens
      .filter(t => STABLECOINS.includes(t.symbol as string))
      .reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0);
      
    const stableRatio = stableValue / totalValue;
    
    if (stableRatio < 0.1) {
      score += 40;
      factors.push("Extremely low stablecoin reserves (< 10%). High market exposure.");
    } else if (stableRatio > 0.8) {
      score += 5;
      factors.push("Very high stablecoin allocation. Low market exposure.");
    }

    if (validTokens.length < 3) {
      score += 30;
      factors.push("Low diversification (less than 3 assets).");
    }
  }

  let level: RiskProfile['level'] = 'LOW';
  if (score > 75) level = 'CRITICAL';
  else if (score > 50) level = 'HIGH';
  else if (score > 25) level = 'MEDIUM';

  return { score, level, factors };
}
