// lib/ratelimit.ts
import Redis from 'ioredis';

const RAW_URL = process.env.REDIS_URL;

let redis: Redis;
if (RAW_URL?.startsWith('redis://') || RAW_URL?.startsWith('rediss://')) {
  // Full DSN provided (recommended): redis://:password@host:port
  redis = new Redis(RAW_URL);
} else {
  // Fallback to local dev if nothing set
  redis = new Redis();
}

// Prevent unhandled error event spam (e.g., WRONGPASS). In dev, just warn once per error kind.
const seen: Record<string, number> = {};
redis.on('error', (err) => {
  const key = err?.message || 'redis-error';
  const now = Date.now();
  if (process.env.NODE_ENV !== 'production') {
    // throttle identical messages to once per 10s
    if (!seen[key] || now - seen[key] > 10_000) {
      seen[key] = now;
      console.warn('[redis] error suppressed:', key);
    }
  }
});

export async function checkRateLimit(userId: string, limit = 30, windowSec = 60) {
  try {
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rl:${userId}:${bucket}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    // Fail-open in dev if Redis is misconfigured; logs are emitted by ioredis
    return { allowed: true, remaining: limit };
  }
}
