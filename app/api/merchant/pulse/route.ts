import { NextResponse } from 'next/server';

// TODO(slot A): write inventory pulse with TTL, publish to Redis channel for SSE.
// Body: MerchantPulsePost. Returns: OkResponse.
export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
