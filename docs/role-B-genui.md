# Slot B — AI / GenUI Lead

> Branch: `feat/genui`
> You own the moment of generation. Headline, register, imagery — all yours.

## What you own

| Surface | What lives there |
|---|---|
| `lib/prompt/**` | `model.ts` (provider toggle), `schema.ts` (Zod), `systemPrompt.ts`, `buildMessages.ts` |
| `lib/intent/**` | Browser-side rule-based intent classifier + movement signal |
| `app/api/offer/generate/**` | The streaming offer endpoint (Vercel AI SDK `streamObject`) |
| `components/gen-ui/**` | Register registry + 3 (or 4) primitive components |
| `public/img/imagery/**` | Curated Unsplash set keyed to `imageryHint` enum |

You don't touch: anything in `app/(consumer)`, `app/(merchant)`, `components/consumer/**`, `components/merchant/**`, `lib/cache/**`, `lib/context/**`, `lib/types/api.ts` (frozen after H2).

## Read first (15 min)

- `PLAN.md` §3 (stack — pay attention to the LLM provider toggle), §7B (your spec), §8 (the `Offer` schema you must produce), §9 (prompt design — read this twice), §10 (privacy posture — your domain too), §11 ("Anthropic prompt caching" subsection).
- `BUILD_PLAN.md` §3B (your hour-by-hour).

## Setup

```bash
git pull origin main
git checkout feat/genui
pnpm install
cp .env.local.example .env.local
```

Keys you need in `.env.local`:

```
LLM_PROVIDER=anthropic                       # default; flip to openai if Anthropic acts up
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6            # or claude-opus-4-7 for richer copy if budget allows
OPENAI_API_KEY=sk-...                        # fallback only
OPENAI_MODEL=gpt-4o
```

You don't need OpenWeatherMap, Ticketmaster, Google Maps, or Redis keys — you'll mock A's context for now.

Smoke test you're ready: `pnpm dev` boots, `curl localhost:3000/api/offer/generate` returns the 501 stub.

## Hour by hour (H2 → H10)

### H2–H3 · Schema + provider

**`lib/prompt/schema.ts`** — Zod schema mirroring `Offer` from `lib/types/api.ts`. Keep field constraints tight so the model can't drift.

```ts
import { z } from 'zod';

export const OfferSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  merchantName: z.string(),
  headline: z.string().max(60),                       // ≤ ~8 words
  subline: z.string().max(110),                       // ≤ ~14 words
  discount: z.object({
    type: z.enum(['percent','fixed','bogo','free_addon']),
    value: z.number().optional(),
    description: z.string().optional(),
  }),
  expiresAt: z.string(),                              // ISO
  contextChips: z.array(z.object({
    icon: z.string(),
    label: z.string(),
    signalKey: z.enum(['weather','proximity','time','demand','event','pulse']),
  })).min(2).max(4),
  ui: z.object({
    register: z.enum(['warm_emotional','factual_urgent','playful_energetic','quiet_premium']),
    primaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
    accent: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
    imageryHint: z.enum([
      'steaming_cup','sunny_terrace','bakery_shelf','evening_pour',
      'bookshop_corner','rainy_window','morning_pastry','bench_break',
    ]),
  }),
  cta: z.string().max(20),
  rationale: z.string(),                              // model self-explanation, debug-only
});
```

**`lib/prompt/model.ts`** — provider-agnostic getter.

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export function getModel() {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'openai') return openai(process.env.OPENAI_MODEL ?? 'gpt-4o');
  return anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6');
}
```

### H3–H4 · System prompt + message builder

**`lib/prompt/systemPrompt.ts`** — Use the skeleton in `PLAN.md` §9. Write it as a single exported `const SYSTEM_PROMPT: string`. Keep it ~1.5K tokens (offer schema described, register rules, tone guidance, 1–2 few-shot examples). Long enough to prompt-cache effectively, short enough to read.

The hard rules to bake in:

- Never invent merchants. Only use the merchant in the input.
- Never exceed `max_discount_pct`.
- Headline ≤ 8 words, sentence case, no exclamation marks, no emojis.
- Subline ≤ 14 words, references the moment.
- Pick exactly one register from the enum. Each register has a clear use case (write it out).
- Pick 2–4 `contextChips` from signals that contributed to the trigger.
- No "limited time only", no "don't miss out", no corporate phrases.

**`lib/prompt/buildMessages.ts`** — takes `(contextState, trigger, merchantRule)`, returns the messages array. Serialize the context as a tight, scannable block (see `PLAN.md` §9 example). Include intent hint and inventory pulse as first-class inputs.

### H4–H6 · The endpoint (with mock context)

**`app/api/offer/generate/route.ts`** — POST handler. Until A's branch lands, accept a request body that contains either `{ contextState, trigger, merchantRule }` *or* a flag `useMockMia: true` that loads a hardcoded `MOCK_MIA_CONTEXT` constant.

```ts
import { streamObject } from 'ai';
import { OfferSchema } from '@/lib/prompt/schema';
import { getModel } from '@/lib/prompt/model';
import { SYSTEM_PROMPT } from '@/lib/prompt/systemPrompt';
import { buildMessages } from '@/lib/prompt/buildMessages';

export async function POST(req: Request) {
  const body = await req.json();
  const { contextState, trigger, merchantRule } = body.useMockMia ? MOCK_MIA_CONTEXT : body;

  const result = streamObject({
    model: getModel(),
    schema: OfferSchema,
    system: SYSTEM_PROMPT,
    messages: buildMessages(contextState, trigger, merchantRule),
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' } },
    },
  });

  return result.toTextStreamResponse();             // streams partial JSON to client
}
```

Test it: `curl -X POST localhost:3000/api/offer/generate -d '{"useMockMia":true}' -H 'Content-Type: application/json'`. Eyeball the streamed output. Iterate prompt until you get headlines that don't suck.

**Define your `MOCK_MIA_CONTEXT`** to match `lib/types/api.ts` exactly. This is the first place a schema mismatch will bite — paste types into the file as a Zod-validated literal so a typo blows up at build time, not at runtime.

### H6–H7 · Browser-side intent + movement

These run in the **browser**, not in your API route. Export client-safe functions.

**`lib/intent/classifier.ts`** — rule-based MVP. Inputs: recent activity log (kept in `localStorage`), current weather (passed in by the page that calls you), time, behavioral signal. Output: one of `'warm_drink_seeking' | 'quick_lunch' | 'window_shopping' | 'commuting' | 'unknown'`.

Heuristics to start with:

- `tempC < 14 && (condition === 'rain' || condition === 'drizzle')` + `behavioral === 'stationary'` → `warm_drink_seeking`.
- `hour in [11..14]` + `behavioral !== 'stationary'` → `quick_lunch`.
- `behavioral === 'strolling'` + `hour in [13..18]` → `window_shopping`.
- `behavioral === 'commuting'` → `commuting`.
- Else → `unknown`.

Document loudly at the top of the file: this label is the *only* thing that crosses the wire. The privacy story rides on this comment.

**`lib/intent/movement.ts`** — speed and stop-frequency over the last 5 min from `navigator.geolocation.watchPosition` deltas. Output: `'stationary' | 'strolling' | 'commuting'`.

- < 0.5 m/s avg over window → `stationary`
- 0.5–1.8 m/s → `strolling`
- > 1.8 m/s → `commuting`

C will call this from the consumer page. Expose a manual override (`forceMovement` localStorage key) for the demo controls panel.

### H7–H9 · GenUI registry + primitives

**`components/gen-ui/registry.ts`**

```ts
import { WarmEmotional } from './WarmEmotional';
import { FactualUrgent } from './FactualUrgent';
import { PlayfulEnergetic } from './PlayfulEnergetic';
// optional: import { QuietPremium } from './QuietPremium';

export const registry = {
  warm_emotional: WarmEmotional,
  factual_urgent: FactualUrgent,
  playful_energetic: PlayfulEnergetic,
  // quiet_premium: QuietPremium,
} as const;
```

**Each primitive accepts `{ offer: Offer }`** and renders a *visually distinct* full card. Distinct means: typography weight + size, color palette (use `offer.ui.primaryColor`), imagery position, copy density.

- `WarmEmotional.tsx` — soft serif heading, warm browns/ambers, large imagery, generous whitespace, intimate copy.
- `FactualUrgent.tsx` — bold sans heading, sharp red/black accents, discount value huge, countdown pill, terse copy.
- `PlayfulEnergetic.tsx` — rounded display font, bright gradient, asymmetric layout, more emoji-friendly chips.
- (optional) `QuietPremium.tsx` — minimal, light serif, off-white, small everything, lots of margin.

Each primitive renders the **same `Offer` shape** — switching registers should never break C's `OfferCard` slot.

Imagery: each primitive resolves `offer.ui.imageryHint` via a small map to `/img/imagery/{hint}.jpg`. If the hint maps to nothing, fallback to a register-specific gradient.

### H9–H10 · Curate imagery + prompt iteration

**`public/img/imagery/`** — drop 8–12 Unsplash images keyed to the enum values. Use Unsplash's free hotlink-friendly URLs *or* download and commit. Keep file sizes < 200KB each. Naming: `steaming_cup.jpg`, `sunny_terrace.jpg`, etc.

**Prompt iteration loop** — write a small dev page (`app/(dev)/prompt-lab/page.tsx`, gated behind `NODE_ENV !== 'production'`) that lets you POST 10–15 different `MOCK_*_CONTEXT` permutations to `/api/offer/generate` and view results side-by-side. Confirm:

- Registers actually vary across contexts (not all `warm_emotional`).
- Headlines never break the 8-word rule.
- Discount value never exceeds `merchantRule.max_discount_pct`.
- `contextChips` reference signals that actually fired.

Tighten `systemPrompt.ts` wherever the model drifts. This is where a hackathon GenUI demo wins or loses.

### H10 · PR

Open the PR. Self-review allowed. Request a quick eyeball from C (the registry shape needs to match what their `OfferCard` slot will render).

## What you produce (consumed by C)

| Endpoint | Consumer | Shape |
|---|---|---|
| `POST /api/offer/generate` | C streams it into `OfferCard` | streaming `Offer` (partial JSON deltas) |
| `lib/intent/classifier.ts` | C imports, runs in-browser, posts label to A's `/api/context/state` | `string` enum |
| `lib/intent/movement.ts` | C imports, runs in-browser | `string` enum |
| `components/gen-ui/registry.ts` | C imports `<GenUIPrimitive register={offer.ui.register} offer={offer} />` | React component |

## What you mock

- **`MOCK_MIA_CONTEXT`** — your hardcoded `ContextState + Trigger + MerchantRule` literal until A's `/api/context/state` is on main. Mark with `// MOCK: replace post-H10`.

## Integration day (H14–H16)

- Rebase `feat/genui` on main *after* A merges.
- In `app/api/offer/generate/route.ts`, remove the `useMockMia` branch. The endpoint now expects real `contextState + trigger + merchantRule` from C's call.
- Smoke: from the Vercel preview, hit `/api/context/state` then pipe the response into `/api/offer/generate`. Confirm streaming works end-to-end.
- After your second call, check Anthropic dashboard: prompt cache hits should be visible. ~90% input cost reduction signals you set up `cacheControl` correctly.
- Sit with C for 10 min: confirm the streaming render in `OfferCard` feels alive (headline first, then chips, then primitive choice).

After H16, your job is prompt tuning + register variety + imagery review. Possibly add `quiet_premium` if there's slack.

## Definition of done (your slot)

- [ ] `OfferSchema` matches `lib/types/api.ts` exactly. Validate by running a stream output through `OfferSchema.parse()` in a smoke test.
- [ ] `streamObject` streams partial deltas (not just the final object). Confirm by logging the partial stream in the prompt lab.
- [ ] `cacheControl: { type: 'ephemeral' }` set on the system prompt. Verify cache hits in the Anthropic dashboard.
- [ ] All 3 primitives render visibly differently with the same `Offer` shape. Eyeball test: print 3 cards side-by-side, register-switched.
- [ ] Imagery resolves for every `imageryHint` enum value (no broken `/img` URLs).
- [ ] Intent classifier runs entirely in the browser (no `import 'server-only'` deps; no API key reads).
- [ ] Movement classifier degrades cleanly when geolocation permission is denied (returns `'unknown'`).
- [ ] `pnpm build` clean, no TS errors.
- [ ] Across 10 distinct mock contexts, the prompt produces 10 distinct offers with at least 2 different registers picked.
- [ ] PR merged, Vercel preview green.
