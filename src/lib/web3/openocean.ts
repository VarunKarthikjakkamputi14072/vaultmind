import { formatUnits } from 'viem';

// OpenOcean v3 aggregator — keyless, real on-chain routing + tx assembly.
// Replaces the dead swapapi.dev integration. Uses the same 0xeee… ETH sentinel
// the rest of the app already uses, so no address remapping is needed.
//
// Quirk: OpenOcean's `amount` is a human-readable decimal (e.g. "1.5"), NOT wei.
// Our routes receive wei (to stay consistent with the simulate flow), so we
// convert wei → human here using the source token's decimals.

const CHAIN_SLUG: Record<string, string> = {
  '1': 'eth',
  '137': 'polygon',
  '42161': 'arbitrum',
  '10': 'optimism',
  '8453': 'base',
  '56': 'bsc',
  '43114': 'avax',
};

const ETH_SENTINEL = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

// Minimal known-decimals map for the tokens this app swaps. Falls back to 18.
const KNOWN_DECIMALS: Record<string, number> = {
  [ETH_SENTINEL]: 18,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // USDT
};

const DEFAULT_GAS_PRICE_GWEI = '10';

export function decimalsFor(address: string): number {
  return KNOWN_DECIMALS[address.toLowerCase()] ?? 18;
}

function chainSlug(chainId: string): string {
  const slug = CHAIN_SLUG[chainId];
  if (!slug) throw new Error(`Unsupported chainId: ${chainId}`);
  return slug;
}

export type SwapTx = { to: string; data: string; value: string };
export type QuoteResult = { toAmount: string; tx: SwapTx };

/** Quote-only: estimated output amount in the destination token's base units. */
export async function openOceanQuote(params: {
  chainId: string; src: string; dst: string; amountWei: string;
}): Promise<{ toAmount: string }> {
  const { chainId, src, dst, amountWei } = params;
  const amount = formatUnits(BigInt(amountWei), decimalsFor(src));

  const url = `https://open-api.openocean.finance/v3/${chainSlug(chainId)}/quote`
    + `?inTokenAddress=${src}&outTokenAddress=${dst}&amount=${amount}&gasPrice=${DEFAULT_GAS_PRICE_GWEI}`;

  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OpenOcean quote HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200 || !json.data) throw new Error(json.message || 'OpenOcean quote failed');
  return { toAmount: String(json.data.outAmount ?? '0') };
}

/** Full swap: estimated output + an executable transaction for `account`. */
export async function openOceanSwap(params: {
  chainId: string; src: string; dst: string; amountWei: string; account: string; slippage: number;
}): Promise<QuoteResult> {
  const { chainId, src, dst, amountWei, account, slippage } = params;
  const amount = formatUnits(BigInt(amountWei), decimalsFor(src));

  const url = `https://open-api.openocean.finance/v3/${chainSlug(chainId)}/swap_quote`
    + `?inTokenAddress=${src}&outTokenAddress=${dst}&amount=${amount}`
    + `&gasPrice=${DEFAULT_GAS_PRICE_GWEI}&slippage=${slippage}&account=${account}`;

  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OpenOcean swap HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200 || !json.data) throw new Error(json.message || 'OpenOcean swap failed');

  const d = json.data;
  if (!d.to || !d.data) throw new Error('OpenOcean returned an incomplete transaction');
  return {
    toAmount: String(d.outAmount ?? '0'),
    tx: { to: String(d.to), data: String(d.data), value: String(d.value ?? '0') },
  };
}
