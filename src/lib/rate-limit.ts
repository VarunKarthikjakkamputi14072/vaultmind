import Redis from 'ioredis';

// Graceful fallback if REDIS_URL is not set yet
const redisUrl = process.env.REDIS_URL || '';
export const redis = redisUrl ? new Redis(redisUrl) : null;

/**
 * Basic rate limiting wrapper.
 * In a real production setup, if redis is null, this should probably fail closed,
 * but to avoid breaking local dev without Redis, we fail open.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (!redis) return true; // Fail open for local dev without redis
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  return current <= limit;
}
