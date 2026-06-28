import { describe, it, expect } from 'vitest';
import { normalizeTenderlyChanges, normalizeAlchemyChanges } from '@/lib/web3/simulate';

const USER = '0x28C6c06298d514Db089934071355E5743bf21d60';

describe('normalizeTenderlyChanges', () => {
  it('classifies direction relative to the user and reads token_info', () => {
    const raw = [
      { from: USER, to: '0xpool', raw_amount: '1500000000000000000', amount: '1.5', dollar_value: '4980',
        token_info: { symbol: 'ETH', decimals: 18, contract_address: null, logo: 'eth.png' } },
      { from: '0xpool', to: USER, raw_amount: '3200000000', amount: '3200',
        token_info: { symbol: 'USDC', decimals: 6, contract_address: '0xusdc' } },
    ];
    const out = normalizeTenderlyChanges(raw, USER);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ symbol: 'ETH', direction: 'out', amount: '1.5', usdValue: 4980 });
    expect(out[1]).toMatchObject({ symbol: 'USDC', direction: 'in', amount: '3200' });
  });

  it('ignores transfers not involving the user', () => {
    const raw = [{ from: '0xa', to: '0xb', raw_amount: '1', token_info: { symbol: 'X', decimals: 18 } }];
    expect(normalizeTenderlyChanges(raw, USER)).toHaveLength(0);
  });
});

describe('normalizeAlchemyChanges', () => {
  it('derives amount from rawAmount + decimals when amount missing', () => {
    const raw = [
      { from: '0xpool', to: USER, rawAmount: '3200000000', decimals: 6, symbol: 'USDC', contractAddress: '0xusdc' },
    ];
    const out = normalizeAlchemyChanges(raw, USER);
    expect(out[0]).toMatchObject({ symbol: 'USDC', direction: 'in', amount: '3200' });
  });

  it('marks outgoing transfers from the user', () => {
    const raw = [{ from: USER, to: '0xpool', rawAmount: '1500000000000000000', decimals: 18, symbol: 'ETH' }];
    const out = normalizeAlchemyChanges(raw, USER);
    expect(out[0]).toMatchObject({ direction: 'out', amount: '1.5' });
  });
});
