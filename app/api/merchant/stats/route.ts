import { NextResponse } from 'next/server';
import { redisMGet, redisLRange } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { ErrorResponse, MerchantStats } from '@/lib/types/api';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const merchantId = url.searchParams.get('merchantId');
  if (!merchantId) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_merchant_id' },
      { status: 400 },
    );
  }

  const counters = await redisMGet<number>([
    k.stats(merchantId, 'generated'),
    k.stats(merchantId, 'accepted'),
    k.stats(merchantId, 'dismissed'),
    k.stats(merchantId, 'expired'),
    k.stats(merchantId, 'redeemed'),
  ]);
  const [generated, accepted, dismissed, expired, redeemed] = counters.map((c) => c ?? 0);

  const recentOffers = await redisLRange<MerchantStats['recentOffers'][number]>(
    k.feed(merchantId),
    0,
    49,
  );

  const response: MerchantStats = {
    generated,
    accepted,
    dismissed,
    expired,
    redeemed,
    acceptanceRate: generated > 0 ? accepted / generated : 0,
    recentOffers,
  };
  return NextResponse.json(response);
}
