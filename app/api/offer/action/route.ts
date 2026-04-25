import { NextResponse } from 'next/server';
import { redisIncr } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import { getOffer, pushFeed } from '@/lib/context/offerStore';
import type {
  ErrorResponse,
  OfferAction,
  OfferActionKind,
  OfferStatus,
  OkResponse,
} from '@/lib/types/api';

const VALID_ACTIONS: OfferActionKind[] = ['accepted', 'dismissed', 'expired', 'redeemed'];

export async function POST(req: Request) {
  let body: Partial<OfferAction>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  if (!body.offerId || !body.action) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_required_fields' },
      { status: 400 },
    );
  }
  if (!VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_action' },
      { status: 400 },
    );
  }

  const offer = await getOffer(body.offerId);
  if (!offer) {
    // Offer expired out of cache or never persisted — accept idempotently.
    return NextResponse.json<OkResponse>({ ok: true });
  }

  await redisIncr(k.stats(offer.merchantId, body.action));
  await pushFeed(offer.merchantId, {
    offerId: offer.id,
    createdAt: body.ts ?? new Date().toISOString(),
    headline: offer.headline,
    status: body.action as OfferStatus,
  });

  return NextResponse.json<OkResponse>({ ok: true });
}
