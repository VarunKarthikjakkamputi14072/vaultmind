import { describe, it, expect } from 'vitest';
import { extractJson, parseStrategyResponse, protocolMeta } from '@/lib/ai/strategy-schema';

const validPayload = JSON.stringify({
  strategies: [
    { title: 'Stake ETH', description: 'Stake via Lido for liquid staking yield.', apy: '3.8%', risk: 'Low', protocol: 'Lido' },
    { title: 'Lend USDC', description: 'Supply USDC to Aave for variable yield.', apy: '4.5%', risk: 'Medium', protocol: 'Aave' },
    { title: 'LP on Curve', description: 'Provide stablecoin liquidity on Curve.', apy: '6.1%', risk: 'High', protocol: 'Curve' },
  ],
});

describe('extractJson', () => {
  it('parses bare JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('isolates JSON wrapped in prose', () => {
    expect(extractJson('Here you go: {"a":1} hope that helps')).toEqual({ a: 1 });
  });

  it('returns null on garbage', () => {
    expect(extractJson('not json at all')).toBeNull();
    expect(extractJson('')).toBeNull();
  });
});

describe('parseStrategyResponse', () => {
  it('parses a valid structured response', () => {
    const result = parseStrategyResponse(validPayload);
    expect(result).toHaveLength(3);
    expect(result?.[0]).toMatchObject({ title: 'Stake ETH', risk: 'Low', protocol: 'Lido' });
  });

  it('handles fenced output from the LLM', () => {
    const result = parseStrategyResponse('```json\n' + validPayload + '\n```');
    expect(result).toHaveLength(3);
  });

  it('caps at 3 strategies', () => {
    const five = JSON.stringify({
      strategies: Array.from({ length: 5 }, (_, i) => ({
        title: `S${i}`, description: 'desc', apy: '1%', risk: 'Low', protocol: 'Aave',
      })),
    });
    expect(parseStrategyResponse(five)).toHaveLength(3);
  });

  it('returns null for the legacy error string', () => {
    expect(parseStrategyResponse('AI service temporarily unavailable')).toBeNull();
  });

  it('returns null when the shape is wrong', () => {
    expect(parseStrategyResponse('{"foo":"bar"}')).toBeNull();
    expect(parseStrategyResponse('{"strategies":[]}')).toBeNull();
  });
});

describe('protocolMeta', () => {
  it('maps known protocols to icon + link', () => {
    expect(protocolMeta('Aave').link).toBe('https://aave.com');
    expect(protocolMeta('lido').link).toBe('https://lido.fi');
    expect(protocolMeta('Uniswap V3').link).toBe('https://app.uniswap.org');
  });

  it('falls back to no link for unknown protocols', () => {
    const meta = protocolMeta('SomeRandomProtocol');
    expect(meta.link).toBe('');
    expect(meta.icon).toBe('⬡');
  });
});
