import { NextResponse } from 'next/server';
import { redisLPush, redisLTrim, redisLRange } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { MerchantRule, ErrorResponse } from '@/lib/types/api';

/**
 * Persistence-only rule API for slot C's rule editor.
 *
 * Brief M2.3: "Show the merchant-side rule interface — even as a mockup."
 * GET ?merchantId returns the rules saved via POST. POST appends a rule
 * to a merchant-scoped list (last 20 retained). Rule evaluation in
 * lib/triggers.ts continues to read from config/cities/*.yaml; this
 * endpoint is a mock-grade persistence layer for the editor UI.
 *
 * If we want saved rules to actually fire later, the aggregator can merge
 * Redis-stored rules with YAML rules. Out of scope for the hackathon demo.
 */

const MAX_RULES_PER_MERCHANT = 19; // keep last 20 (LTRIM is inclusive)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const merchantId = url.searchParams.get('merchantId');
  if (!merchantId) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_merchant_id' },
      { status: 400 },
    );
  }
  const rules = await redisLRange<MerchantRule>(k.rules(merchantId), 0, -1);
  return NextResponse.json({ ok: true, merchantId, rules });
}

export async function POST(req: Request) {
  let body: Partial<MerchantRule>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  if (
    !body.id ||
    !body.merchantId ||
    !body.goal ||
    typeof body.maxDiscountPct !== 'number' ||
    typeof body.validMinutes !== 'number'
  ) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_required_fields' },
      { status: 400 },
    );
  }
  if (body.maxDiscountPct < 0 || body.maxDiscountPct > 100) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_max_discount_pct' },
      { status: 400 },
    );
  }
  if (body.validMinutes <= 0 || body.validMinutes > 1440) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_valid_minutes' },
      { status: 400 },
    );
  }

  const rule: MerchantRule = {
    id: body.id,
    merchantId: body.merchantId,
    goal: body.goal,
    maxDiscountPct: body.maxDiscountPct,
    validMinutes: body.validMinutes,
    when: body.when ?? [],
  };

  await redisLPush(k.rules(rule.merchantId), rule);
  await redisLTrim(k.rules(rule.merchantId), 0, MAX_RULES_PER_MERCHANT);

  return NextResponse.json({ ok: true, rule });
}
