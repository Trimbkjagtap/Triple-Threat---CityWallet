import { NextResponse } from 'next/server';

// TODO(slot A, Phase 4): pre-warm caches for Stuttgart on cold start.
// Hit this from Vercel's deploy hook to populate Redis before the demo.
export async function GET() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
