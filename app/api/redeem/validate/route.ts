import { NextResponse } from 'next/server';
import { redisGet, redisSetNX, redisIncr } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import { pushFeed } from '@/lib/context/offerStore';
import type { ErrorResponse, Offer, ValidateRequest, ValidateResponse } from '@/lib/types/api';

const QR_PREFIX = 'citywallet:';

export async function POST(req: Request) {
  let body: Partial<ValidateRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const raw = body.token ?? '';
  const token = raw.startsWith(QR_PREFIX) ? raw.slice(QR_PREFIX.length) : raw;
  if (!token) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_token' },
      { status: 400 },
    );
  }

  const offer = await redisGet<Offer>(k.token(token));
  if (!offer) {
    const response: ValidateResponse = {
      valid: false,
      reason: 'token_not_found_or_expired',
    };
    return NextResponse.json(response);
  }

  const ttlSec = Math.max(
    60,
    Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000),
  );

  // Single-use lock. SETNX with TTL — second redeem returns false.
  const acquired = await redisSetNX(k.tokenRedeemed(token), offer.id, ttlSec);
  if (!acquired) {
    const response: ValidateResponse = { valid: false, reason: 'already_redeemed' };
    return NextResponse.json(response);
  }

  await redisIncr(k.stats(offer.merchantId, 'redeemed'));
  await pushFeed(offer.merchantId, {
    offerId: offer.id,
    createdAt: new Date().toISOString(),
    headline: offer.headline,
    status: 'redeemed',
  });

  const response: ValidateResponse = { valid: true, offer };
  return NextResponse.json(response);
}
