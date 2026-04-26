import { streamObject } from 'ai';
import { OfferSchema } from '@/lib/prompt/schema';
import { getModel } from '@/lib/prompt/model';
import { SYSTEM_PROMPT } from '@/lib/prompt/systemPrompt';
import { buildMessages } from '@/lib/prompt/buildMessages';
import type { OfferGenerateRequest } from '@/lib/types/api';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Partial<OfferGenerateRequest>;

  const { contextState, trigger, merchantRule } = body;

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
