import { describe, it, expect } from 'vitest';
import { evaluatePortfolioRisk } from '@/lib/ai/risk-engine';

describe('evaluatePortfolioRisk', () => {
  it('rates a diversified, stablecoin-heavy portfolio as LOW risk', () => {
    const result = evaluatePortfolioRisk([
      { symbol: 'USDC', usd_value: 8000 },
      { symbol: 'USDT', usd_value: 1000 },
      { symbol: 'ETH', usd_value: 1000 },
    ]);
    expect(result.level).toBe('LOW');
    expect(result.factors.some((f) => f.toLowerCase().includes('stablecoin'))).toBe(true);
  });

  it('penalizes a concentrated, low-stablecoin portfolio', () => {
    const result = evaluatePortfolioRisk([{ symbol: 'ETH', usd_value: 10000 }]);
    // +40 (low stable reserves) +30 (low diversification)
    expect(result.score).toBe(70);
    expect(result.level).toBe('HIGH');
  });

  it('flags suspected spam tokens', () => {
    const result = evaluatePortfolioRisk([
      { symbol: 'ETH', usd_value: 5000 },
      { symbol: 'SCAM', possible_spam: true, usd_value: 9999 },
      { symbol: 'JUNK', usd_value: 0 },
    ]);
    expect(result.factors.some((f) => f.toLowerCase().includes('spam'))).toBe(true);
    expect(result.level).toBe('CRITICAL');
  });

  it('does not count a spam token toward stablecoin reserves (denominator fix)', () => {
    // A spam token that happens to carry a stablecoin symbol must not inflate the
    // stable ratio. With the fix it is excluded, so reserves read as low.
    const result = evaluatePortfolioRisk([
      { symbol: 'ETH', usd_value: 5000 },
      { symbol: 'USDC', possible_spam: true, usd_value: 5000 },
    ]);
    expect(result.factors.some((f) => f.toLowerCase().includes('low stablecoin'))).toBe(true);
    // +40 low stable +30 low diversification +5 one spam token
    expect(result.score).toBe(75);
    expect(result.level).toBe('HIGH');
  });

  it('returns LOW for an empty portfolio', () => {
    const result = evaluatePortfolioRisk([]);
    expect(result.level).toBe('LOW');
    expect(result.score).toBe(0);
  });
});
