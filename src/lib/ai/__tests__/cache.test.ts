import { describe, it, expect } from 'vitest';
import { cacheKey, getCachedText, setCachedText } from '@/lib/ai/cache';

describe('ai cache', () => {
  it('derives a stable, prompt-sensitive key', () => {
    expect(cacheKey('a', 'b')).toBe(cacheKey('a', 'b'));
    expect(cacheKey('a', 'b')).not.toBe(cacheKey('a', 'c'));
    expect(cacheKey('a', 'b')).toMatch(/^ai_cache:/);
  });

  it('fails open when Redis is not configured', async () => {
    expect(await getCachedText('missing')).toBeNull();
    await expect(setCachedText('k', 'v')).resolves.toBeUndefined();
  });
});
