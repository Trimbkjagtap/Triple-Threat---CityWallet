import { Redis } from '@upstash/redis';

/**
 * Upstash REST client. Reads KV_REST_API_URL + KV_REST_API_TOKEN from env
 * (auto-injected by the Vercel Upstash integration). When env is missing,
 * every helper no-ops so local dev without credentials still boots.
 */
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  // Vercel Upstash integration injects KV_REST_API_*; direct Upstash signup
  // gives UPSTASH_REDIS_REST_*. Accept either pair so local dev and prod
  // env wiring don't have to agree on naming.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

type Envelope<T> = {
  data: T;
  freshUntil: number;   // ms epoch
  staleUntil: number;   // ms epoch
};

// Per-instance singleflight: dedup concurrent misses on the same key.
// Lives as long as the serverless instance — sufficient for our scale.
const inflight = new Map<string, Promise<unknown>>();

/**
 * Stale-while-revalidate cache.
 *
 * - fresh window: serve from cache, no network.
 * - stale window: serve from cache, refresh in background.
 * - past stale: block on fetcher, store, return.
 *
 * When Redis is unavailable, the fetcher runs every call (no caching).
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshSec: number,
  staleSec: number,
): Promise<T> {
  const r = getRedis();
  if (!r) return fetcher();

  const now = Date.now();
  const cached = await r.get<Envelope<T>>(key);

  if (cached && now < cached.freshUntil) return cached.data;

  if (cached && now < cached.staleUntil) {
    revalidateInBackground(key, fetcher, freshSec, staleSec);
    return cached.data;
  }

  return fetchAndStore(key, fetcher, freshSec, staleSec);
}

async function fetchAndStore<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshSec: number,
  staleSec: number,
): Promise<T> {
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = (async () => {
    try {
      const data = await fetcher();
      const r = getRedis();
      if (r) {
        const now = Date.now();
        const envelope: Envelope<T> = {
          data,
          freshUntil: now + freshSec * 1000,
          staleUntil: now + (freshSec + staleSec) * 1000,
        };
        await r.set(key, envelope, { ex: freshSec + staleSec });
      }
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshSec: number,
  staleSec: number,
): void {
  if (inflight.has(key)) return;
  void fetchAndStore(key, fetcher, freshSec, staleSec).catch((err) => {
    console.error(`[cache] background revalidate failed for ${key}:`, err);
  });
}

// ─── Direct primitives (counters, pulses, redemption, feeds) ─────────────────
// These bypass the SWR envelope. Use them for state that isn't a "cached read."

export async function redisGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get<T>(key);
}

export async function redisSet(
  key: string,
  value: unknown,
  opts?: { ex?: number },
): Promise<'OK' | null> {
  const r = getRedis();
  if (!r) return null;
  const result =
    opts?.ex !== undefined
      ? await r.set(key, value, { ex: opts.ex })
      : await r.set(key, value);
  return (result as 'OK' | null) ?? null;
}

/** Atomic SET-if-not-exists with TTL. Used for single-use redemption locks. */
export async function redisSetNX(
  key: string,
  value: unknown,
  ttlSec: number,
): Promise<boolean> {
  const r = getRedis();
  if (!r) return true; // optimistic when no redis: caller decides
  const result = await r.set(key, value, { ex: ttlSec, nx: true });
  return result === 'OK';
}

export async function redisIncr(key: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  return r.incr(key);
}

export async function redisMGet<T>(keys: string[]): Promise<(T | null)[]> {
  const r = getRedis();
  if (!r || keys.length === 0) return keys.map(() => null);
  return r.mget<(T | null)[]>(...keys);
}

export async function redisLPush(key: string, value: unknown): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  return r.lpush(key, value as string);
}

export async function redisLTrim(
  key: string,
  start: number,
  stop: number,
): Promise<'OK' | null> {
  const r = getRedis();
  if (!r) return null;
  return r.ltrim(key, start, stop);
}

export async function redisLRange<T>(
  key: string,
  start: number,
  stop: number,
): Promise<T[]> {
  const r = getRedis();
  if (!r) return [];
  return r.lrange(key, start, stop) as Promise<T[]>;
}

export async function redisDel(key: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  return r.del(key);
}

/** Publish to a Redis channel. Used for SSE fanout (pulses, demand crosses). */
export async function redisPublish(channel: string, message: unknown): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  return r.publish(channel, message as string);
}
