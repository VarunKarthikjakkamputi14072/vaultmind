import { describe, it, expect } from 'vitest';
import { isSpamToken, flagSpam } from '@/lib/spam';

describe('isSpamToken', () => {
  it('flags tokens with URLs/domains in the name', () => {
    expect(isSpamToken('GGBoxs.com', 'GGBoxs.com')).toBe(true);
    expect(isSpamToken('Visit https://get-usdc.com to claim', '$ get-usdc.com')).toBe(true);
    expect(isSpamToken('SNXPool.io', 'SNX')).toBe(true);
  });

  it('flags tokens with bait words', () => {
    expect(isSpamToken('AERO Claim', 'AERO')).toBe(true);
    expect(isSpamToken('Free Airdrop Token', 'DROP')).toBe(true);
    expect(isSpamToken('Reward voucher', 'RWD')).toBe(true);
  });

  it('flags tokens with suspicious leading characters', () => {
    expect(isSpamToken('! AERO', 'AERO')).toBe(true);
    expect(isSpamToken('@SNXPool', '@SNX')).toBe(true);
    expect(isSpamToken('$ get', '$GET')).toBe(true);
  });

  it('does not flag normal tokens', () => {
    expect(isSpamToken('Ether', 'ETH')).toBe(false);
    expect(isSpamToken('Polygon Ecosystem Token', 'POL')).toBe(false);
    expect(isSpamToken('Stargate', 'STG')).toBe(false);
  });

  it('never flags verified contracts even with a triggering name', () => {
    // WETH address — must survive even if name contained a trigger
    expect(isSpamToken('Wrapped Ether airdrop', 'WETH', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')).toBe(false);
    // USDC, case-insensitive address match
    expect(isSpamToken('USD Coin', 'USDC', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe(false);
  });
});

describe('flagSpam', () => {
  it('respects an upstream possible_spam flag', () => {
    expect(flagSpam({ name: 'Totally Normal', symbol: 'TN', possible_spam: true })).toBe(true);
  });

  it('computes from name/symbol when no upstream flag', () => {
    expect(flagSpam({ name: 'claim-rewards.xyz', symbol: 'CLAIM' })).toBe(true);
    expect(flagSpam({ name: 'Dai Stablecoin', symbol: 'DAI' })).toBe(false);
  });

  it('honors the allowlist via token_address', () => {
    expect(flagSpam({
      name: 'Wrapped Ether',
      symbol: 'WETH',
      token_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    })).toBe(false);
  });
});
