import { redisGet, redisSet, redisDel, redisPublish } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { MerchantPulse, PulseKind } from '@/lib/types/api';

/**
 * Inventory pulses — short-lived merchant signals like "fresh batch".
 * Stored at pulse:v1:{merchantId} with Redis TTL so they auto-expire.
 *
 * The brief's Mia narrative explicitly references "just brewed a fresh batch" —
 * this is the channel that carries it.
 */

export async function addPulse(args: {
  merchantId: string;
  kind: PulseKind;
  label: string;
  ttlMinutes?: number;
}): Promise<MerchantPulse> {
  const ttlMin = args.ttlMinutes ?? 30;
  const expiresAt = new Date(Date.now() + ttlMin * 60_000).toISOString();
  const pulse: MerchantPulse = {
    merchantId: args.merchantId,
    kind: args.kind,
    label: args.label,
    expiresAt,
  };

  await redisSet(k.pulse(args.merchantId), pulse, { ex: ttlMin * 60 });
  // Fan out to SSE subscribers (merchant dashboard live feed).
  await redisPublish(k.pubsub.pulseFired(args.merchantId), pulse);

  return pulse;
}

export async function getPulse(merchantId: string): Promise<MerchantPulse | null> {
  return redisGet<MerchantPulse>(k.pulse(merchantId));
}

export async function getPulses(merchantIds: string[]): Promise<MerchantPulse[]> {
  const all = await Promise.all(merchantIds.map(getPulse));
  return all.filter((p): p is MerchantPulse => p !== null);
}

export async function clearPulse(merchantId: string): Promise<void> {
  await redisDel(k.pulse(merchantId));
}
