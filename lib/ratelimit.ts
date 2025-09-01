// lib/ratelimit.ts
import Redis from 'ioredis';

const RAW_URL = process.env.REDIS_URL;

let redis: Redis;
let redisAvailable = false;
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
redis.on('ready', () => {
  redisAvailable = true;
});
redis.on('end', () => {
  redisAvailable = false;
});

// Atomic rate-limit script: INCR and set EXPIRE only on first increment
const incrScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return current
`;

export async function checkRateLimit(userId: string, limit = 30, windowSec = 60) {
  try {
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rl:${userId}:${bucket}`;

    if (!redisAvailable) {
      // Security posture: fail-closed in production; fail-open in dev
      if (process.env.NODE_ENV === 'production') {
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: limit };
    }

    const count = (await redis.eval(incrScript, 1, key, String(windowSec))) as number;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    // On eval/network error: fail-closed in production, open in dev
    if (process.env.NODE_ENV === 'production') {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: limit };
  }
}
