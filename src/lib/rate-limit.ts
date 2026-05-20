import { Redis } from '@upstash/redis';

// Graceful fallback if UPSTASH keys are not set yet
const url = process.env.UPSTASH_REDIS_REST_URL || '';
const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const redis = (url && token) ? new Redis({ url, token }) : null;

/**
 * Basic rate limiting wrapper.
 * Fails open for local dev without redis
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (!redis) return true; 
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  return current <= limit;
}
