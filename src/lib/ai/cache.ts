import { redis } from '@/lib/rate-limit';

// AI narratives are deterministic enough for the same portfolio/quote that
// re-calling the LLM on every request is wasteful. Cache the generated text in
// Upstash keyed by a hash of the prompt. Fails open when Redis isn't configured
// (local dev / tests), exactly like the rate limiter.

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/** FNV-1a 32-bit hash → hex. Deterministic, dependency-free, edge-safe. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function cacheKey(system: string, prompt: string): string {
  return `ai_cache:${hash(`${system}\n${prompt}`)}`;
}

export async function getCachedText(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<string>(key);
    return typeof value === 'string' ? value : null;
  } catch {
    return null; // never let a cache miss/error break the request
  }
}

export async function setCachedText(
  key: string,
  value: string,
  ttlSeconds: number = CACHE_TTL_SECONDS,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // fail open — caching is best-effort
  }
}
