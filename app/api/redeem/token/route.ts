import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { redisSet } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import { getOffer } from '@/lib/context/offerStore';
import type {
  ErrorResponse,
  RedeemTokenRequest,
  RedeemTokenResponse,
} from '@/lib/types/api';

export async function POST(req: Request) {
  let body: Partial<RedeemTokenRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  if (!body.offerId) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_offer_id' },
      { status: 400 },
    );
  }

  const offer = await getOffer(body.offerId);
  if (!offer) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'offer_not_found_or_expired' },
      { status: 404 },
    );
  }

  const expiresAtMs = new Date(offer.expiresAt).getTime();
  const ttlSec = Math.max(60, Math.floor((expiresAtMs - Date.now()) / 1000));

  const token = randomUUID();
  await redisSet(k.token(token), offer, { ex: ttlSec });

  const response: RedeemTokenResponse = {
    token,
    qrPayload: `citywallet:${token}`,
    expiresAt: offer.expiresAt,
  };
  return NextResponse.json(response);
}
