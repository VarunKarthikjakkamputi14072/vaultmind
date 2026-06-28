// Pre-trade transaction simulation via a provider waterfall (Tenderly → Alchemy),
// mirroring the balance/LLM waterfalls elsewhere in the app. Each provider runs
// the transaction against a forked chain state on the provider's side (no local
// Anvil node — that can't run in Vercel's serverless functions) and returns the
// resulting asset balance changes. We normalise every provider into one shape so
// the deterministic risk engine and the LLM narrator can consume it uniformly.

export type AssetDirection = 'in' | 'out';

export type AssetChange = {
  symbol: string;
  decimals: number;
  direction: AssetDirection;
  amount: string;          // human-readable, e.g. "1.5"
  rawAmount: string;       // base units, as returned by the provider
  usdValue: number | null;
  logo: string | null;
  contractAddress: string | null;
};

export type SimProviderStatus = 'success' | 'failed' | 'skipped';
export type SimTraceEntry = { name: string; status: SimProviderStatus; reason?: string };

export type SimulationResult = {
  success: boolean;            // true when a provider simulated without revert
  reverted: boolean;
  provider: string | null;    // which provider produced the result
  assetChanges: AssetChange[];
  gasUsed: number | null;
  revertReason: string | null;
  simTrace: SimTraceEntry[];
};

export type TxInput = {
  from: string;
  to: string;
  data?: string;
  value?: string;             // decimal or 0x-hex string
};

// ── Chain config ────────────────────────────────────────────────────────────
const ALCHEMY_NETWORK: Record<string, string> = {
  '1': 'eth-mainnet',
  '137': 'polygon-mainnet',
  '42161': 'arb-mainnet',
  '10': 'opt-mainnet',
  '8453': 'base-mainnet',
};

function toHex(value?: string): string {
  if (!value) return '0x0';
  if (value.startsWith('0x')) return value;
  try {
    return '0x' + BigInt(value).toString(16);
  } catch {
    return '0x0';
  }
}

function toDecimal(value?: string): string {
  if (!value) return '0';
  if (value.startsWith('0x')) {
    try { return BigInt(value).toString(10); } catch { return '0'; }
  }
  return value;
}

function formatUnitsSafe(raw: string, decimals: number): string {
  try {
    const negative = raw.startsWith('-');
    const digits = (negative ? raw.slice(1) : raw).padStart(decimals + 1, '0');
    const whole = digits.slice(0, digits.length - decimals) || '0';
    const frac = digits.slice(digits.length - decimals).replace(/0+$/, '');
    const out = frac ? `${whole}.${frac}` : whole;
    return negative ? `-${out}` : out;
  } catch {
    return raw;
  }
}

// ── Normalisers (pure, exported for tests) ──────────────────────────────────

/** Tenderly `transaction_info.asset_changes` → AssetChange[] relative to `user`. */
export function normalizeTenderlyChanges(
  changes: unknown[],
  user: string,
): AssetChange[] {
  const out: AssetChange[] = [];
  const lower = user.toLowerCase();
  for (const c of changes as Array<Record<string, unknown>>) {
    const info = (c.token_info ?? {}) as Record<string, unknown>;
    const from = String(c.from ?? '').toLowerCase();
    const to = String(c.to ?? '').toLowerCase();
    let direction: AssetDirection | null = null;
    if (from === lower) direction = 'out';
    else if (to === lower) direction = 'in';
    if (!direction) continue;

    const decimals = Number(info.decimals ?? 18);
    const rawAmount = String(c.raw_amount ?? '0');
    out.push({
      symbol: String(info.symbol ?? 'ETH'),
      decimals,
      direction,
      amount: c.amount != null ? String(c.amount) : formatUnitsSafe(rawAmount, decimals),
      rawAmount,
      usdValue: c.dollar_value != null ? Number(c.dollar_value) : null,
      logo: (info.logo as string) ?? null,
      contractAddress: (info.contract_address as string) ?? null,
    });
  }
  return out;
}

/** Alchemy `alchemy_simulateAssetChanges` `changes` → AssetChange[] relative to `user`. */
export function normalizeAlchemyChanges(
  changes: unknown[],
  user: string,
): AssetChange[] {
  const out: AssetChange[] = [];
  const lower = user.toLowerCase();
  for (const c of changes as Array<Record<string, unknown>>) {
    const from = String(c.from ?? '').toLowerCase();
    const to = String(c.to ?? '').toLowerCase();
    let direction: AssetDirection | null = null;
    if (from === lower) direction = 'out';
    else if (to === lower) direction = 'in';
    if (!direction) continue;

    const decimals = Number(c.decimals ?? 18);
    const rawAmount = String(c.rawAmount ?? '0');
    out.push({
      symbol: String(c.symbol ?? 'ETH'),
      decimals,
      direction,
      amount: c.amount != null ? String(c.amount) : formatUnitsSafe(rawAmount, decimals),
      rawAmount,
      usdValue: null,
      logo: (c.logo as string) ?? null,
      contractAddress: (c.contractAddress as string) ?? null,
    });
  }
  return out;
}

// ── Providers ───────────────────────────────────────────────────────────────

async function simulateTenderly(tx: TxInput, chainId: string): Promise<Omit<SimulationResult, 'simTrace'>> {
  const key = process.env.TENDERLY_ACCESS_KEY;
  const account = process.env.TENDERLY_ACCOUNT;
  const project = process.env.TENDERLY_PROJECT;
  if (!key || !account || !project) throw new Error('SKIP');

  const res = await fetch(
    `https://api.tenderly.co/api/v1/account/${account}/project/${project}/simulate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Key': key },
      body: JSON.stringify({
        network_id: chainId,
        from: tx.from,
        to: tx.to,
        input: tx.data || '0x',
        value: toDecimal(tx.value),
        gas: 8_000_000,
        gas_price: '0',
        save: false,
        save_if_fails: false,
        simulation_type: 'quick',
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!res.ok) throw new Error(`Tenderly HTTP ${res.status}`);
  const data = await res.json();
  const t = data.transaction ?? {};
  const info = t.transaction_info ?? {};
  const reverted = t.status === false;
  return {
    success: !reverted,
    reverted,
    provider: 'Tenderly',
    assetChanges: normalizeTenderlyChanges(info.asset_changes ?? [], tx.from),
    gasUsed: t.gas_used != null ? Number(t.gas_used) : null,
    revertReason: reverted ? String(t.error_message ?? info.error_message ?? 'Transaction reverted') : null,
  };
}

async function simulateAlchemy(tx: TxInput, chainId: string): Promise<Omit<SimulationResult, 'simTrace'>> {
  const key = process.env.ALCHEMY_API_KEY;
  const network = ALCHEMY_NETWORK[chainId];
  if (!key || !network) throw new Error('SKIP');

  const res = await fetch(`https://${network}.g.alchemy.com/v2/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_simulateAssetChanges',
      params: [{
        from: tx.from,
        to: tx.to,
        value: toHex(tx.value),
        data: tx.data || '0x',
      }],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'Alchemy RPC error');
  const result = json.result ?? {};
  const reverted = !!result.error;
  return {
    success: !reverted,
    reverted,
    provider: 'Alchemy',
    assetChanges: normalizeAlchemyChanges(result.changes ?? [], tx.from),
    gasUsed: result.gasUsed != null ? Number(BigInt(result.gasUsed)) : null,
    revertReason: reverted ? String(result.error?.message ?? 'Transaction reverted') : null,
  };
}

// ── Waterfall ───────────────────────────────────────────────────────────────

export async function simulateTransaction(tx: TxInput, chainId = '1'): Promise<SimulationResult> {
  const providers: Array<{ name: string; fn: () => Promise<Omit<SimulationResult, 'simTrace'>> }> = [
    { name: 'Tenderly', fn: () => simulateTenderly(tx, chainId) },
    { name: 'Alchemy',  fn: () => simulateAlchemy(tx, chainId) },
  ];

  const simTrace: SimTraceEntry[] = [];

  for (const provider of providers) {
    try {
      const result = await provider.fn();
      simTrace.push({ name: provider.name, status: 'success' });
      return { ...result, simTrace };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'SKIP') {
        simTrace.push({ name: provider.name, status: 'skipped', reason: 'No API key configured' });
      } else {
        simTrace.push({ name: provider.name, status: 'failed', reason: msg });
      }
    }
  }

  return {
    success: false,
    reverted: false,
    provider: null,
    assetChanges: [],
    gasUsed: null,
    revertReason: null,
    simTrace,
  };
}
