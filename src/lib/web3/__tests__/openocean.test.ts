import { describe, it, expect, vi, afterEach } from 'vitest';
import { decimalsFor, openOceanQuote, openOceanSwap } from '@/lib/web3/openocean';

const ETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(payload: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => payload });
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('decimalsFor', () => {
  it('knows ETH sentinel and USDC, defaults to 18', () => {
    expect(decimalsFor(ETH)).toBe(18);
    expect(decimalsFor(USDC)).toBe(6);
    expect(decimalsFor('0x1234567890123456789012345678901234567890')).toBe(18);
  });
});

describe('openOceanQuote', () => {
  it('converts wei→human in the request and returns base-unit outAmount', async () => {
    const spy = stubFetch({ code: 200, data: { outAmount: '2349891985' } });
    const out = await openOceanQuote({ chainId: '1', src: ETH, dst: USDC, amountWei: '1500000000000000000' });
    expect(out.toAmount).toBe('2349891985');
    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/v3/eth/quote');
    expect(url).toContain('amount=1.5');           // 1.5e18 wei → "1.5"
    expect(url).toContain(`inTokenAddress=${ETH}`);
  });

  it('throws on a non-200 OpenOcean code', async () => {
    stubFetch({ code: 400, message: 'bad pair' });
    await expect(openOceanQuote({ chainId: '1', src: ETH, dst: USDC, amountWei: '1' })).rejects.toThrow(/bad pair/);
  });

  it('rejects an unsupported chain', async () => {
    stubFetch({ code: 200, data: { outAmount: '0' } });
    await expect(openOceanQuote({ chainId: '999', src: ETH, dst: USDC, amountWei: '1' })).rejects.toThrow(/Unsupported chainId/);
  });
});

describe('openOceanSwap', () => {
  it('returns the executable tx shape', async () => {
    stubFetch({ code: 200, data: { outAmount: '2350709698', to: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', data: '0x90411a32', value: '1500000000000000000' } });
    const out = await openOceanSwap({ chainId: '1', src: ETH, dst: USDC, amountWei: '1500000000000000000', account: '0x28C6c06298d514Db089934071355E5743bf21d60', slippage: 1 });
    expect(out.toAmount).toBe('2350709698');
    expect(out.tx).toEqual({ to: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', data: '0x90411a32', value: '1500000000000000000' });
  });

  it('errors when the aggregator omits tx fields', async () => {
    stubFetch({ code: 200, data: { outAmount: '1' } });
    await expect(openOceanSwap({ chainId: '1', src: ETH, dst: USDC, amountWei: '1', account: ETH, slippage: 1 })).rejects.toThrow(/incomplete transaction/);
  });
});
