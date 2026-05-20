export interface RiskProfile {
  score: number; // 0 to 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
}

export function evaluatePortfolioRisk(tokens: Record<string, unknown>[]): RiskProfile {
  let score = 0;
  const factors: string[] = [];

  // Simple rule-based risk evaluation for demonstration
  const totalValue = tokens.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0);
  
  if (totalValue > 0) {
    const stablecoins = ['USDC', 'USDT', 'DAI'];
    const stableValue = tokens
      .filter(t => stablecoins.includes(t.symbol as string))
      .reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0);
      
    const stableRatio = stableValue / totalValue;
    
    if (stableRatio < 0.1) {
      score += 40;
      factors.push("Extremely low stablecoin reserves (< 10%). High market exposure.");
    } else if (stableRatio > 0.8) {
      score += 5;
      factors.push("Very high stablecoin allocation. Low market exposure.");
    }

    if (tokens.length < 3) {
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
