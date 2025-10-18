import Redis from 'ioredis';

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis(process.env.UPSTASH_REDIS_REST_URL, {
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
    tls: { rejectUnauthorized: false },
  } as any);
}

// basic per-minute counter
export async function incrRate(userId: string) {
  if (!redis) {
    // in-memory fallback (resets on serverless cold start)
    (global as any)._rate = (global as any)._rate || new Map<string, { n: number; ts: number }>();
    const k = `${userId}:${Math.floor(Date.now() / 60000)}`;
    const entry = (global as any)._rate.get(k) || { n: 0, ts: Date.now() };
    entry.n += 1;
    (global as any)._rate.set(k, entry);
    return entry.n;
  }
  const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60);
  return n;
}