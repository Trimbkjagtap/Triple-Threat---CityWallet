import { streamObject } from 'ai';
import { OfferSchema } from '@/lib/prompt/schema';
import { getModel } from '@/lib/prompt/model';
import { SYSTEM_PROMPT } from '@/lib/prompt/systemPrompt';
import { buildMessages } from '@/lib/prompt/buildMessages';
import { loadCity } from '@/lib/config/loader';
import type { MerchantRule, OfferGenerateRequest } from '@/lib/types/api';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<OfferGenerateRequest>;
  const { contextState, trigger } = body;

  if (!contextState || !trigger) {
    return Response.json(
      { error: 'missing contextState or trigger' },
      { status: 400 },
    );
  }

  // Look up merchant + rule from city YAML — never trust the frontend for
  // these. Frontend can send a stub merchantRule (legacy contract); we ignore
  // it in favour of the YAML-truth version, so prompt constraints
  // (maxDiscountPct, validMinutes) are always correct.
  const cfg = await loadCity(contextState.location.cityKey);
  const merchant = cfg.merchants.find((m) => m.id === trigger.merchantId);
  if (!merchant) {
    return Response.json(
      { error: `merchant ${trigger.merchantId} not found in ${contextState.location.cityKey}` },
      { status: 400 },
    );
  }

  const ruleConfig = merchant.rules.find((r) => r.id === trigger.ruleId);
  if (!ruleConfig) {
    return Response.json(
      { error: `rule ${trigger.ruleId} not found for ${trigger.merchantId}` },
      { status: 400 },
    );
  }

  const merchantRule: MerchantRule = {
    id: ruleConfig.id,
    merchantId: merchant.id,
    goal: ruleConfig.goal,
    maxDiscountPct: ruleConfig.maxDiscountPct,
    validMinutes: ruleConfig.validMinutes,
    when: ruleConfig.when,
  };

  const result = streamObject({
    model: getModel(),
    output: 'object',
    schema: OfferSchema,
    system: SYSTEM_PROMPT,
    messages: buildMessages(contextState, trigger, merchantRule, {
      id: merchant.id,
      name: merchant.name,
      category: merchant.category,
    }),
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' } },
    },
  });

  return result.toTextStreamResponse();
}
