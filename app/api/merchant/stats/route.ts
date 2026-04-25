import { NextResponse } from 'next/server';

// TODO(slot A): aggregate merchant counters + recent feed. See docs/role-A-backend.md H9–H10.
// Query: ?merchantId=... Returns: MerchantStats.
export async function GET() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
