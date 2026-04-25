import { NextResponse } from 'next/server';

// TODO(slot A): record OfferAction (accepted/dismissed/expired/redeemed) for merchant analytics.
// Body: OfferAction. Returns: OkResponse.
export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
