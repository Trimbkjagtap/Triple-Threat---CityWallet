import { NextResponse } from 'next/server';

// TODO(slot A): SSE stream of context updates. See PLAN.md §11.
// Subscribes to Redis pub/sub channels: pulse:fired:*, demand:cross:*, wx:refreshed:*.
export async function GET() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
