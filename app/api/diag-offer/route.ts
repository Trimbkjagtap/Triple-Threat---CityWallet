import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { OfferSchema } from '@/lib/prompt/schema';
import { getModel } from '@/lib/prompt/model';
import { SYSTEM_PROMPT } from '@/lib/prompt/systemPrompt';
import { buildMessages } from '@/lib/prompt/buildMessages';
import { loadCity } from '@/lib/config/loader';
import type { ContextState, Trigger, MerchantRule } from '@/lib/types/api';

// One-off diagnostic: synchronous generation so schema/parse errors
// surface in the response. DELETE after verification.
export async function GET() {
  const contextState: ContextState = {
    userId: 'diag',
    weather: { tempC: 6, condition: 'clear', summary: 'cold and clear' },
    time: {
      iso: new Date().toISOString(),
      hour: new Date().getHours(),
      dayOfWeek: 'tue',
      period: 'afternoon',
    },
    location: { cityKey: 'stuttgart', lat: 48.7762, lng: 9.1822, inZones: ['altstadt'], neighborhoodId: 'altstadt' },
    demand: [{ merchantId: 'm_cafe_mueller', transactionsPerHour: 12, weeklyAvg: 30, ratio: 0.42 }],
    merchantPulse: [{
      merchantId: 'm_cafe_mueller',
      kind: 'fresh_batch',
      label: 'Just brewed',
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    }],
    events: [],
    behavioral: 'stationary',
    intentHint: 'warm_drink_seeking',
  };
  const trigger: Trigger = {
    ruleId: 'fresh_batch_drop',
    merchantId: 'm_cafe_mueller',
    priority: 8,
    firedSignals: [],
  };
  const merchantRule: MerchantRule = {
    id: 'fresh_batch_drop',
    merchantId: 'm_cafe_mueller',
    goal: 'move fresh inventory',
    maxDiscountPct: 15,
    validMinutes: 20,
    when: [],
  };

  const cfg = await loadCity('stuttgart');
  const merchant = cfg.merchants.find((m) => m.id === 'm_cafe_mueller')!;

  try {
    const result = await generateObject({
      model: getModel(),
      schema: OfferSchema,
      system: SYSTEM_PROMPT,
      messages: buildMessages(contextState, trigger, merchantRule, {
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
      }),
    });
    return NextResponse.json({ ok: true, offer: result.object });
  } catch (err) {
    const e = err as Error & { cause?: unknown };
    return NextResponse.json({
      ok: false,
      error: e.message,
      cause: e.cause ? JSON.stringify(e.cause).slice(0, 1500) : undefined,
      stack: e.stack?.split('\n').slice(0, 6).join('\n'),
    });
  }
}
