import { NextResponse } from 'next/server';
import { redisGet, redisSet } from '@/lib/cache/redis';

/**
 * Temporary diagnostic endpoint. Reports which env vars are present
 * (without leaking values) and probes Upstash with a round-trip ping.
 *
 * Delete this file once Vercel preview is verified green.
 */
export async function GET() {
  const inspect = (name: string) => {
    const v = process.env[name];
    if (v === undefined) return '<undefined>';
    if (v === '') return '<empty string>';
    return `len=${v.length} prefix="${v.slice(0, 12)}..."`;
  };

  const env = {
    KV_REST_API_URL: inspect('KV_REST_API_URL'),
    UPSTASH_REDIS_REST_URL: inspect('UPSTASH_REDIS_REST_URL'),
    KV_REST_API_TOKEN: inspect('KV_REST_API_TOKEN'),
    UPSTASH_REDIS_REST_TOKEN: inspect('UPSTASH_REDIS_REST_TOKEN'),
    OPENWEATHER_API_KEY: inspect('OPENWEATHER_API_KEY'),
    TICKETMASTER_API_KEY: inspect('TICKETMASTER_API_KEY'),
    GOOGLE_MAPS_API_KEY: inspect('GOOGLE_MAPS_API_KEY'),
    MAPS_PROVIDER: process.env.MAPS_PROVIDER ?? '<unset>',
    DEMO_MODE: process.env.DEMO_MODE ?? '<unset>',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    cwd: process.cwd(),
    envKeysMatching: Object.keys(process.env).filter(k => /KV_|UPSTASH_/i.test(k)),
  };

  let redisProbe: { ok: boolean; error?: string; roundTrip?: number } = { ok: false };
  try {
    const t0 = Date.now();
    const probeKey = `_debug:probe:${Date.now()}`;
    await redisSet(probeKey, 'ping', { ex: 30 });
    const got = await redisGet<string>(probeKey);
    redisProbe = { ok: got === 'ping', roundTrip: Date.now() - t0 };
  } catch (err) {
    redisProbe = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({ env, redis: redisProbe });
}
