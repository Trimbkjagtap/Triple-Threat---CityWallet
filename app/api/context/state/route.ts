import { NextResponse } from 'next/server';

// TODO(slot A): real impl. See docs/role-A-backend.md H8–H9.
// Body: ContextStateRequest. Returns: ContextResponse.
export async function POST() {
  return NextResponse.json({ stub: true, owner: 'feat/context' }, { status: 501 });
}
