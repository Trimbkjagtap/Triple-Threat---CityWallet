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

  await addPulse({
    merchantId: body.merchantId,
    kind: body.kind,
    label: body.label,
    ttlMinutes: body.ttlMinutes,
  });

  return NextResponse.json<OkResponse>({ ok: true });
}
