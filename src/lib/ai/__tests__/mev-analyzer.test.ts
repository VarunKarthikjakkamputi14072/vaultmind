import { describe, it, expect } from 'vitest';
import { evaluateMevRisk } from '@/lib/ai/mev-analyzer';

describe('evaluateMevRisk', () => {
  it('short-circuits tiny trades as safe', () => {
    const result = evaluateMevRisk({ usdValue: 10 });
    expect(result.vulnerabilityScore).toBe(10);
    expect(result.sandwichRisk).toBe(false);
    expect(result.frontrunRisk).toBe(false);
  });

  it('flags high price impact as a front-run risk', () => {
    const result = evaluateMevRisk({ usdValue: 500, estimatedPriceImpact: 3 });
    expect(result.frontrunRisk).toBe(true);
    expect(result.vulnerabilityScore).toBeGreaterThanOrEqual(40);
  });

  it('flags high slippage as a sandwich risk', () => {
    const result = evaluateMevRisk({ usdValue: 500, slippage: 2 });
    expect(result.sandwichRisk).toBe(true);
  });

  it('penalizes large-notional trades by USD value, not raw amount length', () => {
    // Big USD trade with otherwise clean params -> the large-trade penalty fires.
    const big = evaluateMevRisk({ usdValue: 50000 });
    expect(big.vulnerabilityScore).toBe(30);

    // Huge raw toAmount string but tiny USD value -> the old length heuristic would
    // have penalized this; it should not anymore.
    const tinyButLong = evaluateMevRisk({
      usdValue: 100,
      toAmount: '1000000000000000000000000',
    });
    expect(tinyButLong.vulnerabilityScore).toBe(0);
  });

  it('recommends an MEV-blocker for critical trades', () => {
    const result = evaluateMevRisk({
      usdValue: 50000,
      estimatedPriceImpact: 3,
      slippage: 2,
    });
    expect(result.vulnerabilityScore).toBeGreaterThan(75);
    expect(result.recommendation).toMatch(/Flashbots|MEV-blocker/i);
  });
});
