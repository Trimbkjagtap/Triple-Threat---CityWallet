import { NextResponse } from 'next/server';

// TODO(slot A): validate token via Redis SETNX lock to prevent double-redeem.
// Body: ValidateRequest. Returns: ValidateResponse.
export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
