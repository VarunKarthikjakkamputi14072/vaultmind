import { z } from 'zod';

// Structured shape we ask the LLM to return, replacing the old fragile
// line-by-line regex parser. The model returns JSON; we validate it with Zod.

export const StrategySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  apy: z.string().default('—'),
  risk: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  protocol: z.string().default('On-chain'),
});

export const StrategyResponseSchema = z.object({
  strategies: z.array(StrategySchema).min(1),
});

export type Strategy = z.infer<typeof StrategySchema>;

// Known protocol → icon + canonical URL. Looked up by name (case-insensitive).
export const PROTOCOL_META: Record<string, { icon: string; link: string }> = {
  aave:     { icon: '👻', link: 'https://aave.com' },
  lido:     { icon: '🌊', link: 'https://lido.fi' },
  uniswap:  { icon: '🦄', link: 'https://app.uniswap.org' },
  compound: { icon: '🏦', link: 'https://compound.finance' },
  curve:    { icon: '〰️', link: 'https://curve.fi' },
  yearn:    { icon: '🔵', link: 'https://yearn.fi' },
  rocketpool: { icon: '🚀', link: 'https://rocketpool.net' },
  pendle:   { icon: '📈', link: 'https://pendle.finance' },
  maker:    { icon: '🏛️', link: 'https://makerdao.com' },
  convex:   { icon: '🔺', link: 'https://convexfinance.com' },
};

export function protocolMeta(protocol: string): { icon: string; link: string } {
  const key = protocol.toLowerCase().replace(/\s+/g, '');
  for (const [name, meta] of Object.entries(PROTOCOL_META)) {
    if (key.includes(name)) return meta;
  }
  return { icon: '⬡', link: '' }; // no link → UI hides the "Open" button
}

/**
 * Pull a JSON object out of an LLM response that may be wrapped in markdown
 * code fences or surrounded by prose. Returns the parsed value or null.
 */
export function extractJson(raw: string): unknown {
  if (!raw) return null;
  // Strip code fences first.
  let text = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  // Isolate the outermost {...} if there's surrounding prose.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Parse + validate an LLM response into a typed strategy list.
 * Returns null when the response can't be coerced into the schema, so callers
 * can fall back to showing the raw text instead of rendering garbage.
 */
export function parseStrategyResponse(raw: string): Strategy[] | null {
  const json = extractJson(raw);
  if (!json) return null;
  const result = StrategyResponseSchema.safeParse(json);
  if (!result.success) return null;
  return result.data.strategies.slice(0, 3);
}
