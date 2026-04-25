import { NextResponse } from 'next/server';

// TODO(slot A): persist merchant rule edits from the rule editor UI.
// POST body: MerchantRule. GET query: ?merchantId=... Returns: MerchantRule[] | OkResponse.
// Coordinate with slot C — they'll POST from app/(merchant)/rules/page.tsx.
export async function GET() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
