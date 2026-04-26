import { NextResponse } from 'next/server';
import { addPulse } from '@/lib/context/inventoryPulse';
import type { MerchantPulsePost, OkResponse, ErrorResponse, PulseKind } from '@/lib/types/api';

const VALID_KINDS: PulseKind[] = [
  'fresh_batch',
  'just_baked',
  'limited_stock',
  'end_of_shift',
  'custom',
];

export async function POST(req: Request) {
  let body: Partial<MerchantPulsePost>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  if (!body.merchantId || !body.kind || !body.label) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_required_fields' },
      { status: 400 },
    );
  }
  if (!VALID_KINDS.includes(body.kind)) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_kind' },
      { status: 400 },
    );
  }

  try {
    await addPulse({
      merchantId: body.merchantId,
      kind: body.kind,
      label: body.label,
      ttlMinutes: body.ttlMinutes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pulse] addPulse failed:', msg);
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: `pulse_failed: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json<OkResponse>({ ok: true });
}
