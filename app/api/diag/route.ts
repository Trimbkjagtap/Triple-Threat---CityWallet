import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { OfferSchema } from '@/lib/prompt/schema';
import { getModel } from '@/lib/prompt/model';
import { SYSTEM_PROMPT } from '@/lib/prompt/systemPrompt';
import { buildMessages } from '@/lib/prompt/buildMessages';
import type { ContextState, Trigger, MerchantRule } from '@/lib/types/api';

/**
 * Temporary diagnostic. Sibling to /api/offer/generate but uses generateObject
 * (synchronous) instead of streamObject, so errors surface in the response
 * instead of silently aborting the stream.
 *
 * Delete this file once /api/offer/generate is verified end-to-end.
 */
export async function GET() {
  const env = {
    ANTHROPIC_API_KEY:
      process.env.ANTHROPIC_API_KEY === undefined
        ? '<undefined>'
        : `len=${process.env.ANTHROPIC_API_KEY.length} prefix="${process.env.ANTHROPIC_API_KEY.slice(0, 8)}..."`,
    OPENAI_API_KEY:
      process.env.OPENAI_API_KEY === undefined
        ? '<undefined>'
        : `len=${process.env.OPENAI_API_KEY.length} prefix="${process.env.OPENAI_API_KEY.slice(0, 8)}..."`,
    LLM_PROVIDER: process.env.LLM_PROVIDER ?? '<unset>',
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? '<unset>',
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? '<unset>',
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  // Build a minimal valid request and try generating one offer.
  const contextState: ContextState = {
    userId: 'diag',
    weather: { tempC: 9, condition: 'drizzle', summary: 'cold and damp' },
    time: {
      iso: new Date().toISOString(),
      hour: new Date().getHours(),
      dayOfWeek: 'tue',
      period: 'afternoon',
    },
    location: { cityKey: 'stuttgart', lat: 48.7762, lng: 9.1822, inZones: ['altstadt'] },
    demand: [{ merchantId: 'm_cafe_mueller', transactionsPerHour: 12, weeklyAvg: 30, ratio: 0.42 }],
    merchantPulse: [
      {
        merchantId: 'm_cafe_mueller',
        kind: 'fresh_batch',
        label: 'Just brewed',
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
    ],
    events: [],
    behavioral: 'stationary',
    intentHint: 'warm_drink_seeking',
  };

  const trigger: Trigger = {
    ruleId: 'fresh_batch_drop',
    merchantId: 'm_cafe_mueller',
    priority: 8,
    firedSignals: [
      { icon: '✨', label: 'Just brewed', signalKey: 'pulse' },
      { icon: '🌧', label: 'Drizzle', signalKey: 'weather' },
      { icon: '📍', label: 'Altstadt', signalKey: 'proximity' },
    ],
  };

  const merchantRule: MerchantRule = {
    id: 'fresh_batch_drop',
    merchantId: 'm_cafe_mueller',
    goal: 'move fresh inventory',
    maxDiscountPct: 15,
    validMinutes: 20,
    when: [],
  };

  let llmResult: unknown;
  try {
    const t0 = Date.now();
    const result = await generateObject({
      model: getModel(),
      schema: OfferSchema,
      system: SYSTEM_PROMPT,
      messages: buildMessages(contextState, trigger, merchantRule),
    });
    llmResult = {
      ok: true,
      ms: Date.now() - t0,
      offer: result.object,
      usage: result.usage,
    };
  } catch (err) {
    llmResult = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    };
  }

  return NextResponse.json({ env, llmResult });
}
