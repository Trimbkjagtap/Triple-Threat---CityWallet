import { NextResponse } from 'next/server';

// TODO(slot A): mint single-use redemption token. See docs/role-A-backend.md H9–H10.
// Body: RedeemTokenRequest. Returns: RedeemTokenResponse.
export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
