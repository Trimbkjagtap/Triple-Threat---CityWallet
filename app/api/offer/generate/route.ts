import { NextResponse } from 'next/server';

// TODO(slot B): streamObject + Zod offer schema. See docs/role-B-genui.md H4–H6.
// Body: OfferGenerateRequest. Returns: streaming Offer.
export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/genui' }, { status: 501 });
}
