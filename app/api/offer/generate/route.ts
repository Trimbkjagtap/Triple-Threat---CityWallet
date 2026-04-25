import { streamObject } from 'ai';
import { OfferSchema } from '@/lib/prompt/schema';
import { getModel } from '@/lib/prompt/model';
import { SYSTEM_PROMPT } from '@/lib/prompt/systemPrompt';
import { buildMessages } from '@/lib/prompt/buildMessages';
import type { ContextState, Trigger, MerchantRule, OfferGenerateRequest } from '@/lib/types/api';

// MOCK: replace post-H10 — Mia scenario for testing without feat/context
const MOCK_MIA_CONTEXT: OfferGenerateRequest = {
  contextState: {
    userId: 'u_mia',
    weather: { tempC: 9, condition: 'drizzle', summary: 'cold and damp' },
    time: {
      iso: new Date().toISOString(),
      hour: 13,
      dayOfWeek: 'tue',
      period: 'afternoon',
    },
    location: {
      cityKey: 'stuttgart',
      lat: 48.7762,
      lng: 9.1822,
      inZones: ['altstadt'],
      neighborhoodId: 'altstadt',
    },
    demand: [
      { merchantId: 'm_cafe_mueller', transactionsPerHour: 5, weeklyAvg: 12, ratio: 0.42 },
    ],
    merchantPulse: [
      {
        merchantId: 'm_cafe_mueller',
        kind: 'fresh_batch',
        label: 'Just brewed',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    ],
    events: [],
    behavioral: 'stationary',
    intentHint: 'warm_drink_seeking',
  } satisfies ContextState,
  trigger: {
    ruleId: 'rain_quiet_warmup',
    merchantId: 'm_cafe_mueller',
    priority: 1,
    firedSignals: [
      { icon: '🌧', label: 'Drizzle', signalKey: 'weather' },
      { icon: '⏰', label: 'Quiet hour', signalKey: 'demand' },
      { icon: '☕', label: 'Fresh batch', signalKey: 'pulse' },
    ],
  } satisfies Trigger,
  merchantRule: {
    id: 'rain_quiet_warmup',
    merchantId: 'm_cafe_mueller',
    goal: 'fill quiet hours',
    maxDiscountPct: 20,
    validMinutes: 30,
    when: [],
  } satisfies MerchantRule,
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Partial<OfferGenerateRequest> & { useMockMia?: boolean };

  const { contextState, trigger, merchantRule } =
    body.useMockMia ? MOCK_MIA_CONTEXT : body;

  if (!contextState || !trigger || !merchantRule) {
    return Response.json({ error: 'missing contextState, trigger, or merchantRule' }, { status: 400 });
  }

  const result = streamObject({
    model: getModel(),
    schema: OfferSchema,
    system: SYSTEM_PROMPT,
    messages: buildMessages(contextState, trigger, merchantRule),
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' } },
    },
  });

  return result.toTextStreamResponse();
}
