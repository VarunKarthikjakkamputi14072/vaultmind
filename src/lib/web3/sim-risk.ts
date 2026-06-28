import type { AssetChange, SimulationResult } from './simulate';

// Deterministic risk assessment of a simulated transaction. Runs locally on the
// asset diff — no LLM required — so a warning is always available even when every
// AI provider is exhausted. The LLM narrative is layered on top for readability.

export type SimRiskLevel = 'Safe' | 'Caution' | 'Critical';

export type SimRisk = {
  score: number;            // 0–100
  level: SimRiskLevel;
  summary: string;          // one deterministic sentence
  slippagePct: number | null; // measured slippage vs expected, when known
  factors: string[];
};

function levelFor(score: number): SimRiskLevel {
  if (score >= 70) return 'Critical';
  if (score >= 35) return 'Caution';
  return 'Safe';
}

/**
 * @param sim         normalised simulation result
 * @param expectedOut optional expected output in base units (e.g. from the quote)
 * @param expectedSymbol symbol of the expected output token (for matching)
 */
export function evaluateSimulationRisk(
  sim: SimulationResult,
  expectedOut?: string | null,
  expectedSymbol?: string | null,
): SimRisk {
  const factors: string[] = [];

  // 1. Revert is the worst case — the transaction would fail and waste gas.
  if (sim.reverted) {
    return {
      score: 100,
      level: 'Critical',
      summary: `Simulation reverted: ${sim.revertReason ?? 'the transaction would fail on-chain'}. Do not sign.`,
      slippagePct: null,
      factors: ['Transaction reverts in simulation'],
    };
  }

  // 2. No provider could simulate — we can't vouch for safety.
  if (!sim.success || sim.provider === null) {
    return {
      score: 50,
      level: 'Caution',
      summary: 'Could not simulate this transaction — proceed only if you trust the route.',
      slippagePct: null,
      factors: ['Simulation unavailable'],
    };
  }

  const outgoing = sim.assetChanges.filter(c => c.direction === 'out');
  const incoming = sim.assetChanges.filter(c => c.direction === 'in');

  // 3. Value leaves the wallet but nothing comes back → 100% slippage / drain.
  const sendsValue = outgoing.some(c => Number(c.amount) > 0);
  if (sendsValue && incoming.length === 0) {
    return {
      score: 95,
      level: 'Critical',
      summary: 'Simulation shows assets leaving your wallet with nothing received (100% slippage). Do not sign this transaction.',
      slippagePct: 100,
      factors: ['Outgoing transfer with zero incoming assets'],
    };
  }

  let score = 0;
  let slippagePct: number | null = null;

  // 4. Measured slippage vs the quoted expectation.
  if (expectedOut && Number(expectedOut) > 0) {
    const match = matchIncoming(incoming, expectedSymbol);
    const received = match ? BigInt(match.rawAmount.replace('-', '')) : BigInt(0);
    const expected = safeBigInt(expectedOut);
    if (expected > BigInt(0)) {
      const shortfall = expected > received ? expected - received : BigInt(0);
      slippagePct = Number((shortfall * BigInt(10000)) / expected) / 100; // 2 dp
      if (slippagePct >= 50) { score = Math.max(score, 90); factors.push(`Severe slippage ~${slippagePct.toFixed(1)}%`); }
      else if (slippagePct >= 10) { score = Math.max(score, 60); factors.push(`High slippage ~${slippagePct.toFixed(1)}%`); }
      else if (slippagePct >= 3) { score = Math.max(score, 35); factors.push(`Elevated slippage ~${slippagePct.toFixed(1)}%`); }
    }
  }

  // 5. Receiving many distinct tokens can indicate an unexpected/route-spam tx.
  if (incoming.length > 3) {
    score = Math.max(score, 35);
    factors.push(`Unusual: ${incoming.length} different tokens received`);
  }

  const level = levelFor(score);
  const summary =
    level === 'Safe'
      ? `Simulation looks healthy${slippagePct != null ? ` (~${slippagePct.toFixed(2)}% slippage)` : ''}: ${describeFlow(outgoing, incoming)}.`
      : `${level === 'Critical' ? 'High risk' : 'Caution'}: ${factors.join('; ') || 'review the simulated changes before signing'}.`;

  return { score, level, summary, slippagePct, factors };
}

function matchIncoming(incoming: AssetChange[], symbol?: string | null): AssetChange | null {
  if (!incoming.length) return null;
  if (symbol) {
    const m = incoming.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
    if (m) return m;
  }
  // Otherwise the largest incoming transfer is the most likely swap output.
  return incoming.reduce((a, b) => (Number(b.amount) > Number(a.amount) ? b : a));
}

function safeBigInt(v: string): bigint {
  try { return BigInt(v.split('.')[0]); } catch { return BigInt(0); }
}

function describeFlow(outgoing: AssetChange[], incoming: AssetChange[]): string {
  const o = outgoing.map(c => `${trim(c.amount)} ${c.symbol}`).join(', ') || 'nothing';
  const i = incoming.map(c => `${trim(c.amount)} ${c.symbol}`).join(', ') || 'nothing';
  return `send ${o}, receive ${i}`;
}

function trim(amount: string): string {
  const n = Number(amount);
  if (!isFinite(n)) return amount;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
