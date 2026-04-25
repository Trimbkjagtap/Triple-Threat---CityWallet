import { redisGet, redisSet, redisIncr, redisLPush, redisLTrim } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { Offer, OfferStatus } from '@/lib/types/api';

/**
 * Helpers for offer lifecycle persistence.
 *
 * Slot B's /api/offer/generate calls persistOffer immediately after streaming
 * completes — that's how the redemption endpoints (slot A) and the merchant
 * dashboard see new offers without coupling B to the merchant analytics path.
 */

const FEED_MAX = 99;

export async function persistOffer(offer: Offer): Promise<void> {
  const ttlSec = Math.max(60, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000));
  await redisSet(k.offer(offer.id), offer, { ex: ttlSec });
  await redisIncr(k.stats(offer.merchantId, 'generated'));
  await pushFeed(offer.merchantId, {
    offerId: offer.id,
    createdAt: new Date().toISOString(),
    headline: offer.headline,
    status: 'pending',
  });
}

export async function getOffer(offerId: string): Promise<Offer | null> {
  return redisGet<Offer>(k.offer(offerId));
}

export async function pushFeed(
  merchantId: string,
  entry: { offerId: string; createdAt: string; headline: string; status: OfferStatus },
): Promise<void> {
  await redisLPush(k.feed(merchantId), entry);
  await redisLTrim(k.feed(merchantId), 0, FEED_MAX);
}
