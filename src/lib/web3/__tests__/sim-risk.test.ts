import { describe, it, expect } from 'vitest';
import { evaluateSimulationRisk } from '@/lib/web3/sim-risk';
import type { SimulationResult, AssetChange } from '@/lib/web3/simulate';

function sim(partial: Partial<SimulationResult>): SimulationResult {
  return {
    success: true, reverted: false, provider: 'Tenderly',
    assetChanges: [], gasUsed: 120000, revertReason: null, simTrace: [],
    ...partial,
  };
}

const out = (symbol: string, amount: string, raw: string, decimals = 18): AssetChange =>
  ({ symbol, decimals, direction: 'out', amount, rawAmount: raw, usdValue: null, logo: null, contractAddress: null });
const inc = (symbol: string, amount: string, raw: string, decimals = 6): AssetChange =>
  ({ symbol, decimals, direction: 'in', amount, rawAmount: raw, usdValue: null, logo: null, contractAddress: null });

describe('evaluateSimulationRisk', () => {
  it('flags a revert as Critical', () => {
    const r = evaluateSimulationRisk(sim({ reverted: true, success: false, revertReason: 'STF' }));
    expect(r.level).toBe('Critical');
    expect(r.score).toBe(100);
    expect(r.summary).toMatch(/revert/i);
  });

  it('flags value leaving with nothing received as 100% slippage Critical', () => {
    const r = evaluateSimulationRisk(sim({ assetChanges: [out('ETH', '1.5', '1500000000000000000')] }));
    expect(r.level).toBe('Critical');
    expect(r.slippagePct).toBe(100);
  });

  it('treats a healthy swap close to expected as Safe', () => {
    const r = evaluateSimulationRisk(
      sim({ assetChanges: [out('ETH', '1.5', '1500000000000000000'), inc('USDC', '3200', '3200000000')] }),
      '3200000000', 'USDC',
    );
    expect(r.level).toBe('Safe');
    expect(r.slippagePct).toBeLessThan(3);
  });

  it('escalates to Caution/Critical as measured slippage grows', () => {
    // expected 3200 USDC but only 2800 received → 12.5% slippage
    const mid = evaluateSimulationRisk(
      sim({ assetChanges: [out('ETH', '1.5', '1500000000000000000'), inc('USDC', '2800', '2800000000')] }),
      '3200000000', 'USDC',
    );
    expect(mid.level).toBe('Caution');
    expect(mid.slippagePct).toBeCloseTo(12.5, 1);

    // only 1000 received → 68.75% slippage
    const bad = evaluateSimulationRisk(
      sim({ assetChanges: [out('ETH', '1.5', '1500000000000000000'), inc('USDC', '1000', '1000000000')] }),
      '3200000000', 'USDC',
    );
    expect(bad.level).toBe('Critical');
  });

  it('returns Caution when simulation was unavailable', () => {
    const r = evaluateSimulationRisk(sim({ success: false, provider: null }));
    expect(r.level).toBe('Caution');
    expect(r.summary).toMatch(/could not simulate/i);
  });
});
