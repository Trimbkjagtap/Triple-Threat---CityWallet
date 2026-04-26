import { getOrFetch, redisGet, redisSet, redisDel } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { DemandSnapshot } from '@/lib/types/api';

/**
 * Simulated Payone transaction-density stream.
 *
 * Brief explicitly marks Payone as a DSV proprietary asset to simulate.
 * We synthesize transactionsPerHour from a deterministic per-merchant baseline,
 * a hour-of-day seasonality curve, and seeded noise — so values are stable
 * within an hour but evolve naturally across the day.
 *
 * Demo affordance: forceQuiet(merchantId, ratio) persists an override that
 * bypasses the simulation, so we can deterministically trigger the quiet-hour
 * rule on camera.
 */

export async function getDemand(merchantIds: string[]): Promise<DemandSnapshot[]> {
  const epochHour = Math.floor(Date.now() / 3_600_000);

  return Promise.all(
    merchantIds.map(async (id) => {
      const override = await readQuietOverride(id);
      if (override !== null) return overrideSnapshot(id, override);

      return getOrFetch<DemandSnapshot>(
        k.payone(id, epochHour),
        async () => simulateDemand(id, epochHour),
        /* freshSec */ 300,
        /* staleSec */ 900,
      );
    }),
  );
}

export function simulateDemand(merchantId: string, epochHour: number): DemandSnapshot {
  const weeklyAvg = baselineFor(merchantId);
  const hour = new Date(epochHour * 3_600_000).getUTCHours();
  const seasonal = hourMultiplier(hour);
  const noise = 0.7 + seededRand(hashStr(merchantId) ^ epochHour) * 0.6;
  const transactionsPerHour = Math.max(0, Math.round(weeklyAvg * seasonal * noise));
  return {
    merchantId,
    transactionsPerHour,
    weeklyAvg,
    ratio: weeklyAvg === 0 ? 0 : transactionsPerHour / weeklyAvg,
  };
}

/**
 * Force a merchant into a target demand ratio for the demo.
 * Default 0.4 (well below the 0.6 threshold rules typically use).
 */
export async function forceQuiet(
  merchantId: string,
  ratio = 0.4,
  ttlSec = 600,
): Promise<void> {
  await redisSet(k.payoneOverride(merchantId), ratio, { ex: ttlSec });
}

export async function clearQuiet(merchantId: string): Promise<void> {
  await redisDel(k.payoneOverride(merchantId));
}

// ─── internals ───────────────────────────────────────────────────────────────

async function readQuietOverride(merchantId: string): Promise<number | null> {
  const value = await redisGet<number>(k.payoneOverride(merchantId));
  return typeof value === 'number' ? value : null;
}

function overrideSnapshot(merchantId: string, ratio: number): DemandSnapshot {
  const weeklyAvg = baselineFor(merchantId);
  return {
    merchantId,
    transactionsPerHour: Math.round(weeklyAvg * ratio),
    weeklyAvg,
    ratio,
  };
}

function baselineFor(merchantId: string): number {
  // Deterministic 20–49 transactions/hour weekly average.
  return 20 + (hashStr(merchantId) % 30);
}

/**
 * Hour-of-day demand curve, calibrated for an Altstadt café/bakery/wine-bar mix.
 * Quiet at 10–11 and 14–16, peaks at 12–13 (lunch) and 18–19 (early evening).
 */
function hourMultiplier(hour: number): number {
  const curve = [
    /* 00 */ 0.2, 0.1, 0.1, 0.1, 0.1, 0.2,
    /* 06 */ 0.4, 0.7, 1.1, 1.0, 0.6, 0.5,
    /* 12 */ 1.4, 1.5, 1.0, 0.8, 0.7, 1.0,
    /* 18 */ 1.4, 1.3, 1.0, 0.7, 0.5, 0.3,
  ];
  return curve[hour] ?? 1;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Mulberry32 — small, fast, deterministic. */
function seededRand(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}
