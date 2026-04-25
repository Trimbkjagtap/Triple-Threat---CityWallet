import { NextResponse } from 'next/server';
import { aggregate } from '@/lib/context/aggregator';
import { evaluateTriggers } from '@/lib/triggers';
import { loadCity } from '@/lib/config/loader';
import { forceQuiet } from '@/lib/context/payone';
import type {
  ContextResponse,
  ContextStateRequest,
  ErrorResponse,
  Trigger,
} from '@/lib/types/api';

export async function POST(req: Request) {
  let body: Partial<ContextStateRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  if (
    !body.userId ||
    !body.cityKey ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number'
  ) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: 'missing_required_fields' },
      { status: 400 },
    );
  }

  const demoOn = process.env.DEMO_MODE === 'true';

  // Demo override — force a merchant into quiet demand for the next 10 min.
  if (demoOn && body.demoQuiet) {
    await forceQuiet(body.demoQuiet, 0.42, 600);
  }

  const cfg = await loadCity(body.cityKey);
  const state = await aggregate({
    userId: body.userId,
    lat: body.lat,
    lng: body.lng,
    cityKey: body.cityKey,
    intentHint: body.intentHint ?? 'unknown',
    behavioral: body.behavioral ?? 'unknown',
  });

  // Demo override — bypass evaluation, fire a specific rule by id.
  if (demoOn && body.demoForceRule) {
    const forced = forceTrigger(cfg, body.demoForceRule);
    if (forced) {
      const response: ContextResponse = { context: state, trigger: forced };
      return NextResponse.json(response);
    }
  }

  const trigger = evaluateTriggers(state, cfg);
  const response: ContextResponse = { context: state, trigger };
  return NextResponse.json(response);
}

function forceTrigger(
  cfg: Awaited<ReturnType<typeof loadCity>>,
  ruleId: string,
): Trigger | null {
  for (const merchant of cfg.merchants) {
    const rule = merchant.rules.find((r) => r.id === ruleId);
    if (rule) {
      return {
        ruleId: rule.id,
        merchantId: merchant.id,
        priority: rule.priority,
        firedSignals: [],
      };
    }
  }
  return null;
}
