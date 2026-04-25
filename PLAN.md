# City Wallet — Hackathon Plan

> Hack-Nation × MIT × DSV-Gruppe · Challenge 01 · Generative City Wallet
> Team of 3. GitHub branches. Web stack. Pitching Stuttgart.

---

## 1. The pitch (memorize this)

**City Wallet is a Living Wallet.** Offers don't exist until the moment they're needed. A user walking through Stuttgart on a cold Tuesday afternoon doesn't see a coupon book. They see one widget, generated for this minute, this person, this café two blocks away — because the rain just started, the café is unusually quiet, and they like warm drinks. The merchant only set a goal ("fill quiet hours with up to 20% off"). The AI did the rest.

It's a real-time context layer for local commerce. Not a coupon database.

**Why DSV is the right home for this.** Sparkassen sit in 50 million customer relationships. Payone runs the merchant terminals. S-Markt & Mehrwert runs the merchant portals. No global e-commerce platform owns that triangle. City Wallet is the AI layer that turns it into something Amazon cannot replicate: hyperlocal demand response, on the corner, in the neighborhood, on a Tuesday.

---

## 2. Why this wins (judging rubric mapped)

| Judging axis | How we score |
|---|---|
| **Innovation & creativity** | "Living Wallet" framing. Offers are generated on the fly via GenUI primitives, not pulled from a table. On device intent classifier so only abstract intent reaches the server. |
| **Technical depth** | End to end closed loop. Configurable context engine driven by YAML. Structured offer generation via tool use. Streaming GenUI render. Real weather API + simulated Payone stream + geofencing. |
| **Communication** | 90 second video walking through Mia's afternoon. Clean phone frame UI. Merchant dashboard shown side by side. Architecture diagram. Privacy posture explicit. |

The brief's own warnings tell us where teams fail:
- Static dummy offers behind a pretty UI → we beat this with real generation.
- Merchant view skipped → we ship a dashboard, even if half is mocked stats.
- Over engineered AI under engineered UX → we spend the design budget on the consumer card, the notification, and the redemption animation.
- No privacy story → we have one and we explain it on camera.

---

## 3. Stack decisions (locked)

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js 16.2 (App Router) + TypeScript | Single repo, single Vercel deploy, three teammates hot reload the same thing. Turbopack is now default for `next dev` and `next build`. |
| Styling | Tailwind + shadcn/ui | Fast, looks good by default, no design system bikeshedding. |
| LLM | Vercel AI SDK as the abstraction layer (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`). Provider toggled via `LLM_PROVIDER=anthropic\|openai`. Default: `claude-sonnet-4-6` via Anthropic. Fallback: `gpt-4o` via OpenAI. Native structured outputs via `streamObject` + Zod. Anthropic prompt caching via `providerOptions.anthropic.cacheControl` | Provider agnostic from day one. One `getModel()` helper, one Zod schema, one `streamObject` call works for both. Prompt caching cuts cost ~90% and latency ~50% on Claude after the first call. Sonnet 4.6 is the right balance for short structured creative output; Opus 4.7 is the optional upgrade. |
| State | React useState + URL params (no Redux) | Hackathon scope. |
| State + Cache | Redis (Upstash on Vercel for deploy, local Redis for dev), accessed via `@upstash/redis` HTTP client (works in serverless) | Universal state + cache layer. Stores cached signals (weather, events, geocode, map URLs), offers, redemption tokens, merchant rules, merchant stats, inventory pulses. Atomic INCR counters for analytics. Pub/sub for live merchant dashboard updates. SQLite on Vercel serverless is broken (ephemeral fs); Redis is the right primitive. Free tier covers our traffic by ~100x. |
| QR | `qrcode` npm package | One liner, scannable. |
| Maps | Provider interface with two implementations: `lib/maps/google.ts` (default, Static Maps + Geocoding) and `lib/maps/osm.ts` (Nominatim geocoding + a static tile fallback). Toggled via `MAPS_PROVIDER=google\|osm` env var | Brief calls Google Maps out by name, but free SKU caps are 10K events/month each. OSM toggle is the safety valve if we approach the cap or billing becomes friction during the hackathon. Both implementations behind one interface so the swap is config only. |
| Events | Ticketmaster Discovery API behind an `EventsProvider` interface | Real Stuttgart events live (concerts, theatre, sports). Eventbrite's public search was deprecated in 2019, so the brand is unusable for ad hoc city search. Eventbrite slots back in via config once an org token exists. Free tier: 5000 calls/day, 5 req/sec. |
| Transactions | Simulated Payone stream (we generate it) | Brief explicitly marks Payone as a DSV proprietary asset to simulate. |
| Deploy | Vercel with Upstash Redis integration | Free, fast, one command. Upstash auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. |
| City | Stuttgart, configurable via YAML | Matches the brief's narrative example. |
| Mobile target | Mobile web inside a fake iOS phone frame component | Demo controllable, build fast, brief explicitly mentions web frameworks. |

We are **not** doing: native iOS, React Native, Flutter, separate FastAPI service, real push notifications, real WebLLM SLM (stretch only), Google Places API for merchant discovery (we hardcode merchants), cashback redemption (brief allows QR *or* cashback — QR is more demo-visible and the `validate` API stays the same shape if cashback is layered on later).

**Databricks (evaluated, not used).** Considered Lakebase as a cold path store alongside Redis with Delta auto sync for merchant analytics, and Agent Bricks AI Gateway as the LLM proxy. Free Edition explicitly excludes Lakebase, which was the half that justified the integration. AI Gateway alone is ~3 hours of workspace setup for a thin demo beat that judges won't visibly distinguish from "we use Anthropic." If a Databricks-specific prize emerges at the event, AI Gateway can slot in front of the existing Vercel AI SDK call as a thin proxy — recorded here so the option is documented, not built.

---

## 4. Repo structure

```
city-wallet/
  app/
    (consumer)/
      page.tsx                  # phone home: empty state, map background
      offer/[id]/page.tsx       # offer detail
      redeem/[token]/page.tsx   # QR + success
    (merchant)/
      page.tsx                  # dashboard
      rules/page.tsx            # rule editor
    api/
      context/state/route.ts    # POST: composite context for a user
      offer/generate/route.ts   # POST: Claude call, streaming JSON
      redeem/token/route.ts     # POST: mint redemption token
      redeem/validate/route.ts  # POST: merchant scan
      merchant/stats/route.ts   # GET: aggregate metrics
  components/
    consumer/
      PhoneFrame.tsx            # iOS chrome wrapper
      LockScreen.tsx            # mock lock screen with widget
      PushNotification.tsx      # animated banner overlay
      OfferCard.tsx             # the in app card
      RedeemView.tsx            # QR + countdown
    gen-ui/
      WarmEmotional.tsx         # primitive: cold weather, intimate tone
      FactualUrgent.tsx         # primitive: clear discount, scarcity
      PlayfulEnergetic.tsx      # primitive: warm weather, color heavy
      registry.ts               # maps register name -> component
    merchant/
      RuleEditor.tsx
      LiveFeed.tsx
      StatsGrid.tsx
  lib/
    context/
      weather.ts                # OpenWeatherMap fetch
      payone.ts                 # simulated transaction stream (DSV proprietary asset, simulated)
      inventoryPulse.ts         # merchant-side realtime pulses ("fresh batch")
      aggregator.ts             # merges signals into ContextState
      triggers.ts               # YAML rule evaluator
    events/
      provider.ts               # EventsProvider interface
      ticketmaster.ts           # default impl, real Stuttgart events
      eventbrite.ts             # stub w/ org-token path documented
      cache.ts                  # disk cache + fixtures fallback
    maps/
      provider.ts               # MapsProvider interface
      google.ts                 # Static Maps + Geocoding (server-side only)
      osm.ts                    # OSM Nominatim geocoding + tile fallback
      distance.ts               # pure haversine, no API
    cache/
      redis.ts                  # Upstash client wrapper, TTL constants, SWR helpers
      keys.ts                   # centralized cache key builders (no magic strings)
    intent/
      classifier.ts             # browser side intent classifier (rule based MVP)
      movement.ts               # browser side behavioral signal
    prompt/
      model.ts                  # provider-agnostic getModel() — reads LLM_PROVIDER
      systemPrompt.ts
      schema.ts                 # zod schema for offer
      buildMessages.ts
    config/
      loader.ts                 # YAML loader
  config/
    cities/
      stuttgart.yaml            # merchants, neighborhoods, rules
  fixtures/                     # disk snapshots of external API responses for demo fallback
  public/
    img/                        # merchant photos, city outline
  CLAUDE.md                     # short context for Claude Code
  README.md
  PLAN.md                       # this file
```

---

## 5. Branch strategy

Three long lived feature branches off `main`. Each owner has a clear surface area. Cross branch contracts are JSON, defined in `lib/types/api.ts` which gets merged to `main` first so everyone can mock.

| Branch | Owner | Surface |
|---|---|---|
| `feat/context` | Backend lead | `app/api/context/**`, `lib/context/**`, `lib/config/**`, `config/cities/stuttgart.yaml`, simulated Payone generator, redemption API |
| `feat/genui` | AI lead | `app/api/offer/generate/route.ts`, `lib/prompt/**`, `lib/intent/**`, `components/gen-ui/**` |
| `feat/frontend` | Frontend lead (Vivek) | `app/(consumer)/**`, `app/(merchant)/**`, `components/consumer/**`, `components/merchant/**`, Tailwind theme, demo polish |

### Integration order

1. **Hour 0–2.** One person scaffolds the Next.js app, drops in shadcn, commits `lib/types/api.ts` with all request/response shapes, opens three branches.
2. **Hour 2–10.** Each branch develops against mocks. Frontend stubs the API client. Genui returns hardcoded JSON. Context returns a fixture state.
3. **Hour 10–14.** Merge `feat/context` to main. Genui starts hitting real `/api/context/state`. Frontend swaps mock client to real fetch.
4. **Hour 14–18.** Merge `feat/genui`. Frontend renders streamed offers.
5. **Hour 18–22.** Merge `feat/frontend` polish. Full integration test of Mia scenario.
6. **Hour 22–end.** Record video, write README, deploy.

### Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`. Squash on merge.
- One PR per branch into `main`. Self review allowed.
- No force pushes to main.
- Keep `main` deployable. Vercel auto deploys main to a preview URL we use for the demo.

---

## 6. Demo scenario (Mia's day)

This is the script the video follows and the script everything else serves. The brief asks us to address four UX questions explicitly. We answer each on camera, in order.

> **Setting:** Stuttgart Altstadt, Tuesday 13:47, 9°C, drizzle starting.
> Mia (28, marketing) has 12 minutes between meetings. She's been stationary for 3 minutes, browsing windows. She has accepted "warm drink" offers in the past.

**Scene 1 — composite context fires (4 sec).** Cut to merchant dashboard for Café Müller. Three signals light up at once: weather (drizzle, 9°C), demand (transactions per hour at 0.42 of weekly average), inventory pulse (the barista just tapped "Fresh batch"). Loaded rule: "max 20% off, weekdays, when transactions per hour < 60% AND weather is cold/wet." This is the *composite* context state the brief calls for.

**Scene 2 — first UX pillar: where the interaction happens (4 sec).** Three surfaces shown side by side as quick cuts: lock screen widget, push notification, in-app card. Voiceover: *"Three channels, one offer, picked by attention budget."*

**Scene 3 — second UX pillar: how the offer addresses Mia (6 sec).** Push slides down: *"Cold outside? Your cappuccino is waiting."* Voiceover: *"Emotional register. Picked by the model because the context is cold, quiet, and the user is browsing not commuting."* Quick cut to a *factual* register variant for a different scenario, just to show the model picks the framing — it's not hardcoded.

**Scene 4 — third UX pillar: first 3 seconds (6 sec).** Tap the push. The full card opens. On screen we freeze and overlay arrows: headline (5 words), three context chips (🌧 Drizzle · 📍 80m · ⏰ Quiet hour), one CTA. No scrolling. Voiceover: *"Five word headline. Three signal chips. One action. Comprehended in three seconds."*

**Scene 5 — accept and redeem (8 sec).** Tap "Use offer." QR rotates in. Countdown 29:47. Behind the QR, the privacy chip: *"On device intent: warm drink seeking. Only this label crossed the wire."*

**Scene 6 — merchant scans (4 sec).** Cut to merchant view: scan validates, green check, transaction logged. Dashboard counter ticks up. Acceptance rate refreshes to 34%.

**Scene 7 — fourth UX pillar: how the offer ends (5 sec).** Cut to a parallel timeline: a *different* user dismisses the same push with a swipe. Toast: *"You won't see this for 24 hours."* No re-prompt. On the merchant dashboard, a decline counter ticks up. Voiceover: *"Acceptance, expiry, dismissal. Each path is intentional."*

**Scene 8 — close the loop (3 sec).** Café Müller's transactions per hour line bends back upward. Acceptance rate steady at 34%. End on the Living Wallet tagline.

Total demo footage: ~40 seconds. Wrapping intro and architecture: 50 seconds. Hits 90 seconds clean. Each of the 4 UX pillars gets named on camera.

---

## 7. Module breakdown

### 7A. Context + Backend (`feat/context`)

**Goal.** Aggregate at least two visible context categories into a `ContextState`, evaluate YAML rules, expose `/api/context/state`.

**Tasks**
- Implement `lib/context/weather.ts` calling OpenWeatherMap with a server side API key. Cache 10 min.
- Implement `lib/context/payone.ts` as a generator. For each merchant in `stuttgart.yaml`, simulate transactions per hour with a seeded random walk + a daily seasonality curve + an injectable "quiet" override for the demo. Expose a hook to force a quiet state for a target merchant during the demo run.
- Implement `lib/context/inventoryPulse.ts`. Merchants can post short-lived signals via the dashboard ("Fresh batch", "Just baked", "Last 3 seats", "End of shift bake-off"). Each pulse has a TTL (default 30 min) and surfaces in `ContextState.merchantPulse[]` for the merchant the user is near. The brief's Mia story explicitly references "just brewed a fresh batch" — this is the channel.
- Implement `lib/events/provider.ts` as an interface, plus `lib/events/ticketmaster.ts` as the default implementation. Pulls real Stuttgart events via Ticketmaster Discovery API (`/discovery/v2/events`, `city=Stuttgart`, `radius`, sort by date). Events surface in `ContextState.events[]` with distance and "starts in N minutes". Add `lib/events/eventbrite.ts` stub that documents the org-token path as a config-swap option.
- Implement `lib/events/cache.ts`. Disk-backed cache for events lookups (TTL 1 hour). Writes a `fixtures/events.json` snapshot on first call so the demo can fall back if Ticketmaster is slow during recording.
- Implement `lib/maps/google.ts`. Wraps Google Maps Static Maps API for phone frame backgrounds and Geocoding API for city → coords. Server side only (API key never reaches the client). Disk cache static map images by `(center, zoom)` key.
- Implement `lib/maps/distance.ts`. Pure haversine. No API. Used everywhere we need "80m away" copy.
- Implement `lib/maps/geofence.ts`. Pure point-in-polygon (ray casting). No API. Evaluates which neighborhood polygons (defined in YAML) contain `(lat, lng)`, populating `ContextState.location.inZones`. Powers the `location.inZone` trigger predicate. The brief explicitly names "user location via geo-fencing" — this is where it lives.
- Implement `lib/context/aggregator.ts`. Given `(userId, lat, lng, cityKey, behavioralSignal)`, returns a `ContextState`. Pulls weather, demand, events, pulses, plus runs distance calc on nearby merchants.
- Implement `lib/triggers.ts`. Reads rules from `config/cities/stuttgart.yaml`, evaluates each against the state, returns a `Trigger | null` for the highest priority rule that fires. Rules can reference inventory pulses (`pulse.fresh_batch: true`), events (`event.within: 200m AND starts_in: < 90min`), and geofenced zones (`location.inZone: altstadt`).
- Implement `app/api/context/state/route.ts`. POST handler.
- Implement redemption: `app/api/redeem/token/route.ts` mints a JWT-ish opaque token tied to an offer id and TTL. `validate/route.ts` consumes it.
- Implement `app/api/merchant/stats/route.ts`. Returns aggregate metrics from the redemption store.
- Implement `app/api/merchant/pulse/route.ts`. POST endpoint for merchants to push an inventory pulse. Used by the dashboard one-tap buttons.

**`config/cities/stuttgart.yaml` example**

```yaml
city: stuttgart
center: { lat: 48.7758, lng: 9.1829 }
neighborhoods:
  - { id: altstadt, name: Altstadt, polygon: [...] }
merchants:
  - id: m_cafe_mueller
    name: Café Müller
    category: cafe
    location: { lat: 48.7762, lng: 9.1822 }
    rules:
      - id: rain_quiet_warmup
        when:
          - weather.condition: ["rain", "snow", "drizzle"]
          - weather.tempC: { lt: 14 }
          - demand.self: { lt: 0.6 }   # 60% of weekly avg
          - time.dayOfWeek: ["mon","tue","wed","thu"]
          - location.inZone: altstadt   # geofenced — only fires when user is inside the polygon
        max_discount_pct: 20
        valid_minutes: 30
        goal: "fill quiet hours"
events:
  - id: e_stuttgart_open_air
    name: Schloßplatz Open Air
    location: { lat: 48.7783, lng: 9.1779 }
    starts: 2026-04-25T18:00
    ends: 2026-04-25T23:00
```

### 7B. Generative Engine (`feat/genui`)

**Goal.** Given a `ContextState` and a fired `Trigger`, produce a structured `Offer` and pick a GenUI primitive. Stream the result.

**Tasks**
- Define `Offer` zod schema in `lib/prompt/schema.ts` (see section 8).
- Build `lib/prompt/systemPrompt.ts`. Strict instructions: never invent merchants, must respect `max_discount_pct`, must pick a register from the registry, headline ≤ 8 words, subline ≤ 14 words.
- Build `lib/prompt/buildMessages.ts`. Takes `(contextState, trigger, merchantRule)`, returns structured messages. The intent hint and inventory pulse are first class inputs to the prompt — they shape register selection and copy.
- Implement `app/api/offer/generate/route.ts` using Vercel AI SDK's `streamObject` with the offer Zod schema. Reads the model via `getModel()` so the LLM provider is env-driven. Streams the partial object to the client.
- Build `components/gen-ui/registry.ts` mapping register names (`warm_emotional`, `factual_urgent`, `playful_energetic`, optionally `quiet_premium`) to React components.
- Build the three primitives. Each accepts the same `Offer` shape and renders distinctively. Each pairs with a curated imagery set (see imagery strategy below).
- Build `lib/intent/classifier.ts` (browser side). Inputs: recent activity log, current weather, time, *behavioral movement signature* (stationary / strolling / commuting derived from device motion or geolocation deltas). Outputs one of `["warm_drink_seeking","quick_lunch","window_shopping","commuting","unknown"]`. Document loudly: only the label crosses the wire.
- Build `lib/intent/movement.ts` (browser side). Lightweight movement classifier: speed and stop-frequency over the last 5 minutes → `'stationary' | 'strolling' | 'commuting'`. The brief's Mia narrative ("stopped twice in 10 minutes... browsing not commuting") demands this. For the demo we expose a manual override in the dev panel.

### Imagery strategy

The brief says "appropriate imagery." We don't ship a generative image model in MVP. Instead:

1. **Curated Unsplash set** (8–12 images) keyed to `imageryHint` values: `steaming_cup`, `sunny_terrace`, `bakery_shelf`, `evening_pour`, `bookshop_corner`, etc. Lives in `public/img/imagery/`. The model picks a hint from a documented enum; the frontend resolves it to an image.
2. **Register-driven gradients** as fallback and as background overlay. Each register has a 2-stop gradient palette (warm browns, cold blues, sunny ambers).
3. **Tinted typography** keyed to `primaryColor` returned by the model. The model picks the color from the merchant brand or the register palette.

This is enough to look generative without a generative image bill. Real SDXL or Flux integration stays in stretch goals.

### 7C. Frontend + UX (`feat/frontend`)

**Goal.** The thing the judges see. Ship the phone frame, the three notification surfaces, redemption, and the merchant dashboard.

**Tasks**
- `components/consumer/PhoneFrame.tsx`. Fixed width (~390px), iOS-style status bar, home indicator, dynamic island. Background is a Stuttgart map render (Mapbox static image or simple SVG).
- `components/consumer/LockScreen.tsx`. Mock lock screen with time, date, and a widget slot. Shows the offer as a lock screen widget when triggered.
- `components/consumer/HomescreenBanner.tsx`. Mock iOS homescreen with app icons and a banner row near the dock that hosts the live offer. Brief lists this as one of four channels — we ship the mock.
- `components/consumer/PushNotification.tsx`. Slides down from the dynamic island, supports tap-through.
- `components/consumer/OfferCard.tsx`. The in-app full card. Renders a `<GenUIPrimitive register={offer.ui.register} offer={offer} />`. **Always shows a context chip row** (e.g. 🌧 Drizzle · 📍 80m · ⏰ Quiet hour) above the headline. This is how we satisfy the brief's "at least two context signals visible to the user" requirement unambiguously.
- `components/consumer/ContextChips.tsx`. Renders 2–4 chips from `ContextState`. Each chip has an icon + a short label. The set is selected automatically by the renderer based on which signals contributed to the trigger.
- `components/consumer/RedeemView.tsx`. QR with countdown, "Show at counter" copy. Polls `/api/redeem/validate` for status; on success, animates check.
- `components/consumer/DismissSheet.tsx`. Triggered by swipe-down or tap-X on push or in-app card. Brief toast: *"You won't see this for 24 hours."* Posts a `decline` event to the backend (counted in merchant stats). No re-prompt for that merchant for 24h. This is the brief's fourth UX pillar made real.
- `app/(consumer)/page.tsx`. The home view. Listens via SSE or polling to `/api/context/state`. When a trigger fires, mounts the push notification and (after 2s if untapped) populates lock screen + homescreen banner mocks.
- `app/(merchant)/page.tsx`. Dashboard. Live feed of offers generated, accept/decline/dismiss counters, transactions-per-hour chart for the merchant's quiet-hour rule, list of fired rules, **inventory pulse buttons** ("Fresh batch", "Just baked", "Limited stock") that POST to `/api/merchant/pulse`.
- `app/(merchant)/rules/page.tsx`. Rule editor. Form-based: max discount, valid minutes, goal, conditions (weather, transaction threshold, day of week, inventory pulse). On save, writes to a JSON file or DB row that the trigger engine reads.
- Demo affordance: a "Demo controls" panel only visible in dev mode that lets us force-trigger a context state, set behavioral signal, and toggle inventory pulses. Critical for video reshoots.

---

## 8. API contracts

> Source of truth: `lib/types/api.ts`. Merge to main first.

```ts
// Context
type BehavioralSignal = 'stationary' | 'strolling' | 'commuting' | 'unknown';

type MerchantPulse = {
  merchantId: string;
  kind: 'fresh_batch' | 'just_baked' | 'limited_stock' | 'end_of_shift' | 'custom';
  label: string;             // human readable, used in copy
  expiresAt: string;         // ISO
};

type ContextChip = { icon: string; label: string; signalKey: 'weather'|'proximity'|'time'|'demand'|'event'|'pulse' };

type ContextState = {
  userId: string;
  weather: { tempC: number; condition: 'clear'|'cloud'|'rain'|'snow'|'drizzle'|'fog'; summary: string };
  time: { iso: string; hour: number; dayOfWeek: 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'; period: 'morning'|'midday'|'afternoon'|'evening'|'night' };
  location: { cityKey: string; lat: number; lng: number; inZones: string[]; neighborhoodId?: string }; // inZones populated by geofence point-in-polygon eval
  demand: Array<{ merchantId: string; transactionsPerHour: number; weeklyAvg: number; ratio: number }>;
  merchantPulse: MerchantPulse[];                       // active inventory pulses for nearby merchants
  events: Array<{ id: string; name: string; distanceMeters: number; startsInMinutes: number }>;
  behavioral: BehavioralSignal;                         // produced on-device from movement
  intentHint: 'warm_drink_seeking'|'quick_lunch'|'window_shopping'|'commuting'|'unknown'; // produced on-device
};

type Trigger = { ruleId: string; merchantId: string; priority: number; firedSignals: ContextChip[] };

type ContextResponse = { context: ContextState; trigger: Trigger | null };

// Offer
type Offer = {
  id: string;
  merchantId: string;
  merchantName: string;
  headline: string;          // ≤ 8 words
  subline: string;           // ≤ 14 words
  discount: { type: 'percent'|'fixed'|'bogo'|'free_addon'; value?: number; description?: string };
  expiresAt: string;         // ISO
  contextChips: ContextChip[];                          // 2–4 chips, always rendered above headline
  ui: {
    register: 'warm_emotional'|'factual_urgent'|'playful_energetic'|'quiet_premium';
    primaryColor: string;    // hex
    accent?: string;
    imageryHint: 'steaming_cup'|'sunny_terrace'|'bakery_shelf'|'evening_pour'|'bookshop_corner'|'rainy_window'|'morning_pastry'|'bench_break';
  };
  cta: string;               // e.g. "Use offer"
  rationale: string;         // human readable, debug only
};

// Redemption
type RedeemTokenResponse = { token: string; qrPayload: string; expiresAt: string };
type ValidateResponse = { valid: boolean; offer?: Offer; reason?: string };

// User actions on an offer (for merchant analytics)
type OfferAction = { offerId: string; action: 'accepted' | 'dismissed' | 'expired' | 'redeemed'; ts: string };

// Merchant
type MerchantPulsePost = { merchantId: string; kind: MerchantPulse['kind']; label: string; ttlMinutes?: number };

type MerchantStats = {
  generated: number;
  accepted: number;
  dismissed: number;
  expired: number;
  redeemed: number;
  acceptanceRate: number;
  recentOffers: Array<{ offerId: string; createdAt: string; headline: string; status: 'pending'|'accepted'|'dismissed'|'expired'|'redeemed' }>;
};
```

---

## 9. Prompt design (offer engine)

### Provider abstraction

We use the **Vercel AI SDK** so the LLM provider is a one line swap. `lib/prompt/model.ts` exports a single `getModel()` that reads `LLM_PROVIDER` from env and returns the appropriate provider binding. Default is Anthropic; OpenAI is the fallback.

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export function getModel() {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'openai') return openai(process.env.OPENAI_MODEL ?? 'gpt-4o');
  return anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6');
}
```

### Structured output via Zod

The Vercel AI SDK normalizes structured output across providers via `generateObject` and `streamObject`. No manual tool_choice tricks, no provider specific JSON mode. Same Zod schema works for both.

```ts
import { streamObject } from 'ai';
import { OfferSchema } from './schema';
import { getModel } from './model';

const result = streamObject({
  model: getModel(),
  schema: OfferSchema,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: contextSerialized }],
  providerOptions: {
    anthropic: { cacheControl: { type: 'ephemeral' } },  // prompt caching when on Claude
  },
});

for await (const partial of result.partialObjectStream) {
  // stream to client as the object fills in
}
```

### System prompt skeleton

```
You are the offer engine for City Wallet. Your job: generate ONE offer that fits THIS user, THIS moment, and THIS merchant's rules.

Hard rules:
- Never invent merchants. Only use the merchant in the input.
- Never exceed merchant's max_discount_pct.
- valid_minutes from rule = your expiry.
- headline: ≤ 8 words, sentence case, no exclamation marks, no emojis.
- subline: ≤ 14 words. Concrete, never generic. Reference the moment (weather, time, neighborhood) when natural.
- Pick ONE register from: warm_emotional | factual_urgent | playful_energetic | quiet_premium.
  - warm_emotional: cold weather, low energy, comfort framing.
  - factual_urgent: clear value, urgency, time pressure.
  - playful_energetic: warm weather, energetic, color heavy.
  - quiet_premium: calm, refined, evening, premium goods.
- Tone matches register. No corporate phrases. No "limited time only". No "don't miss out".
- Pick contextChips from the signals that actually contributed to this trigger. 2 to 4 chips. Each is a short icon + label.

Three second rule: a person glancing at the headline must understand the offer. If your headline needs a subline to make sense, rewrite it.
```

### Example user message construction

```
Context:
- Weather: 9°C, drizzle, "cold and damp"
- Time: Tuesday afternoon, 13:47
- Location: Stuttgart Altstadt
- Intent hint: warm_drink_seeking
- Behavioral: stationary
- Merchant: Café Müller (cafe, 80m away)
- Merchant demand: 0.42 of weekly avg (quiet)
- Merchant pulse: fresh_batch (just brewed)
- Events nearby: none

Merchant rule fired: rain_quiet_warmup
- max_discount_pct: 20
- valid_minutes: 30
- goal: fill quiet hours

Generate the offer.
```

---

## 10. Privacy / GDPR posture (the on camera story)

This is a 15 second beat in the video. Script:

> "User movement, history, and preferences never leave the device. A small classifier runs in the browser and produces a single intent label. Only that label is sent upstream. In production this would be a quantized SLM like Phi 3 Mini or Gemma 2B in the secure enclave. Today, we ship a rule based stub and the architecture that makes the swap a one liner."

Where this shows up in code:
- `lib/intent/classifier.ts` runs in the browser. The server endpoint `/api/context/state` accepts `intentHint` in the request body and trusts it as already abstracted.
- A small chip on the offer card reads "On device intent: warm drink seeking" so the user (and the judge) sees that the system is honest about what it knows and what it sent.

---

## 11. Runtime architecture and optimizations

The closed loop has three hot paths: context evaluation, offer generation, and redemption. Each gets optimized differently.

### Cache topology (Redis is the spine)

Every external read is wrapped in `lib/cache/redis.ts`. Keys are versioned and namespaced, defined in `lib/cache/keys.ts` so nothing in the codebase uses raw strings.

| Data | Key pattern | Fresh TTL | Stale TTL | Why |
|---|---|---|---|---|
| Weather | `wx:v1:{cityKey}` | 10 min | 60 min | Weather is city-wide; one fetch serves all users in Stuttgart |
| Events | `ev:v1:{cityKey}` | 1 hr | 6 hr | Concert lineups don't change minute-to-minute |
| Geocode | `geo:v1:{addressHash}` | forever | — | Coordinates are immutable |
| Static map URL | `map:v1:{centerHash}:{zoom}` | forever | — | Same params → same image |
| Payone simulated stream | `pay:v1:{merchantId}:hour:{epoch_hr}` | 5 min | 15 min | Per merchant per hour bucket |
| Inventory pulse | `pulse:v1:{merchantId}` | TTL = pulse expiresAt | — | Auto-expires via Redis TTL |
| Offer | `offer:v1:{offerId}` | TTL = expiresAt | — | Auto-expires |
| Redemption token | `tok:v1:{token}` | TTL = expiresAt | — | Auto-expires; SETNX on first redeem to prevent reuse |
| Merchant rules | `rules:v1:{merchantId}` | forever | — | Versioned by edit; bumped on save |
| Merchant stats counters | `stats:v1:{merchantId}:{generated\|accepted\|dismissed\|expired\|redeemed}` | forever | — | Atomic INCR on each event |
| Recent offers feed | `feed:v1:{merchantId}` | rolling 100 | — | Redis LIST with LPUSH + LTRIM |

### Stale-while-revalidate (`getOrFetch` helper)

```ts
async function getOrFetch<T>(key: string, fetcher: () => Promise<T>, freshSec: number, staleSec: number): Promise<T> {
  const cached = await redis.get<{ data: T; freshUntil: number; staleUntil: number }>(key);
  const now = Date.now();
  if (cached && now < cached.freshUntil) return cached.data;            // fresh: return
  if (cached && now < cached.staleUntil) {
    revalidateInBackground(key, fetcher, freshSec, staleSec);           // stale: return + refresh
    return cached.data;
  }
  return await fetchAndStore(key, fetcher, freshSec, staleSec);          // miss: block on fetch
}
```

User waits for an external API at most once per (key, expiry window). After that it's all cache, all the time.

### Aggregator parallelism

`lib/context/aggregator.ts` runs every read in parallel:

```ts
const [weather, events, demand, geocode, pulses] = await Promise.all([
  getWeather(cityKey),
  getEvents(cityKey),
  getDemand(merchantIds),
  getGeocodeForUserCity(cityKey),
  getPulses(merchantIds),
]);
```

Wall time = max(individual call), not sum. With cached signals this is ~30ms; with cold cache it's ~250ms (longest single external call).

### Anthropic prompt caching

Our system prompt is ~1.5K tokens (offer schema + register rules + tone guidance + few-shot examples). We mark it for caching via the Vercel AI SDK's `providerOptions.anthropic.cacheControl`. After the first call, subsequent calls hit the cache: ~90% input cost reduction, ~50% latency drop. Critical for cost since Sonnet 4.6 is ~$3 / M input tokens at full price.

```ts
streamObject({
  model: getModel(),
  schema: OfferSchema,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: contextSerialized }],
  providerOptions: {
    anthropic: { cacheControl: { type: 'ephemeral' } },
  },
});
```

Note: this is provider-specific. When `LLM_PROVIDER=openai`, OpenAI's automatic prompt caching kicks in for inputs over 1024 tokens with no extra config.

### SSE for context streaming

Replaces client polling with a server push. `app/api/context/stream/route.ts` opens a `text/event-stream` and emits a new context state when:

- A merchant pulse fires (pub/sub `pulse:fired:*`)
- A demand threshold crosses (pub/sub `demand:cross:*`)
- A weather refresh happens that changes the trigger evaluation
- A 30-second heartbeat for liveness

```ts
export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      const sub = redis.subscribe(['pulse:fired:*','demand:cross:*','wx:refreshed:*'], send);
      req.signal.addEventListener('abort', () => sub.unsubscribe());
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

Client uses `EventSource('/api/context/stream')`. Reconnect handling is built-in to the browser API. The merchant dashboard subscribes to its own `merchant:{id}:events` channel for the live feed.

### Pre-warm on cold start

`app/api/_warm/route.ts` is hit by Vercel's deployment hook (or manually before recording). It runs `getOrFetch` for Stuttgart's weather, events, and merchant geocodes, populating Redis. Means the first viewer of the demo never waits for cold caches.

### Streaming offer generation

`/api/offer/generate` returns a streaming response. The client's `OfferCard` component renders progressively as fields arrive: headline first (within ~200ms first token), then subline, then chips, then the GenUI register choice. Feels alive on camera.

### What we are NOT doing (and why)

- **Singleflight / request coalescing.** At hackathon traffic levels, the SWR pattern alone prevents the thundering herd. Singleflight adds Redis lock complexity for marginal gain.
- **Edge runtime / regional caching.** Vercel does enough automatically. Migrating route handlers to the edge runtime adds cold-start surprises around Node APIs and the Vercel AI SDK's streaming primitives.
- **Custom response shape minimization.** Marginal at our scale; readability wins.

---

## 12. Setup

### Env vars (`.env.local`)

```
# LLM provider toggle: anthropic | openai
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6           # or claude-opus-4-7 for richer creative copy
OPENAI_API_KEY=sk-...                       # required only if LLM_PROVIDER=openai or as runtime fallback
OPENAI_MODEL=gpt-4o

OPENWEATHER_API_KEY=...
TICKETMASTER_API_KEY=...                    # https://developer.ticketmaster.com (free tier: 5000 calls/day, 5 req/sec)

# Maps provider toggle: google | osm
MAPS_PROVIDER=google
GOOGLE_MAPS_API_KEY=...                     # Static Maps API + Geocoding API enabled. Restrict by domain. Set per-SKU daily quota cap (e.g. 1000) in Cloud Console. Free cap is 10K events/month per SKU.
# OSM Nominatim is keyless. Required header: a user agent string.
OSM_USER_AGENT=city-wallet-hackathon/1.0 (contact@example.com)

# Redis: works with Upstash REST credentials (deploy) OR a normal redis URL (local dev)
KV_REST_API_URL=...                         # injected by Upstash Vercel integration
KV_REST_API_TOKEN=...
# OR for local dev:
# REDIS_URL=redis://localhost:6379

DEMO_MODE=true                              # forces context overrides on demand, falls back to cached fixtures if APIs are slow
```

### Third-party API setup notes

- **Upstash Redis (recommended for deploy):** in the Vercel dashboard, go to Storage → Marketplace → Upstash. One-click install. Free tier: 256MB data, 500K commands/month, 10 free databases. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into the project's env. No code changes.
- **Google Cloud:** create a project, enable Static Maps API and Geocoding API, generate an API key, restrict it to `localhost:3000` and the Vercel domain, set a daily quota cap (e.g. 1000) in the cloud console to prevent surprise bills. Free tier as of 2026: 10,000 events/month per SKU. Owner: whoever picks Branch A. About 15 min one time.
- **Ticketmaster:** register at developer.ticketmaster.com, copy the consumer key. Free tier 5000 calls/day, 5 req/sec. No card required. The Discovery API `/discovery/v2/events.json` accepts `city=Stuttgart`, `countryCode=DE`, `latlong`, `radius`. Note: Ticketmaster's German event coverage skews to large venues; if Stuttgart looks sparse, our `fixtures/events.json` fallback covers the demo.
- **OSM Nominatim:** keyless. Required: a unique `User-Agent` header per their usage policy. Rate limit: 1 req/sec. Plenty for our use case (we cache geocode forever).
- **Demo fixtures:** on first successful call to each external API, our cache layer also writes a snapshot to `fixtures/`. If `DEMO_MODE=true` and a live call fails or times out, we serve from fixtures. Keeps the recorded video stable.

### Commands

```bash
pnpm install
pnpm dev                         # http://localhost:3000
```

For local dev with Vivek's existing Redis: set `REDIS_URL` and `REDIS_TOKEN` in `.env.local` to point at it. For deploy: install the Upstash integration from the Vercel marketplace (one click), it auto-provisions a database and injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Our `lib/cache/redis.ts` reads either pair, no code change.

Three browser tabs for the demo:
- `http://localhost:3000/` consumer (inside phone frame)
- `http://localhost:3000/merchant` dashboard
- `http://localhost:3000/merchant/rules` rule editor

### Vercel deploy

```bash
vercel
# add env vars in Vercel dashboard
vercel --prod
```

---

## 13. CLAUDE.md hints (for Claude Code)

Drop this near the root so Claude Code grabs it on start:

```
This is a hackathon project. Move fast. Skip tests unless logic is non trivial.
Stack: Next.js 16.2, TypeScript strict, Tailwind utility classes only, shadcn primitives, no inline styles.
LLM: Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`). All model calls go through lib/prompt/model.ts which reads LLM_PROVIDER from env. Default is anthropic with claude-sonnet-4-6. Use streamObject + Zod schema for structured output, never the raw provider SDK. Mark the system prompt with cacheControl: { type: 'ephemeral' } via providerOptions.anthropic for prompt caching.
Persistence: Redis only (no Prisma, no SQLite). All state goes through lib/cache/redis.ts. Keys are defined in lib/cache/keys.ts; never construct cache keys inline.
Caching: every external read goes through getOrFetch (stale-while-revalidate). Two TTLs per key: fresh and stale. See lib/cache/redis.ts.
Maps: lib/maps/provider.ts is the interface. lib/maps/google.ts and lib/maps/osm.ts are the implementations. Selection is by env MAPS_PROVIDER.
Events: lib/events/provider.ts is the interface. lib/events/ticketmaster.ts is the default. Eventbrite is a stub.
Never hardcode merchants, rules, or city parameters in code. They live in config/cities/*.yaml.
Never generate offers outside lib/prompt/. The model is the source of creativity.
Never invent context signals. The user only ever sees signals that flowed through lib/context/aggregator.ts.
GenUI registers are an enum. Adding a register means: a new entry in registry.ts AND a new primitive component AND a system prompt update.
Privacy: anything user-personal (history, preferences, raw GPS) stays in the browser. Only Offer + intentHint + behavioral label cross the wire.
Streaming: /api/offer/generate uses streamObject to stream the offer object as it fills in. /api/context/stream is SSE. Use ReadableStream in App Router route handlers.
```

---

## 14. Stretch goals (only if integration is done by hour 18)

- Real on-device SLM via `@xenova/transformers` for intent classification.
- Image generation per offer via a small SDXL Turbo endpoint, cached.
- Eventbrite as a second active provider (seeded org with Stuttgart events) to demo provider swap on camera.
- Google Places API integration to auto-discover merchants near a user (instead of YAML-hardcoded list).
- Mapbox geofencing with simulated user walk path on the map.
- A second city in YAML to show config-driven extensibility on camera.

---

## 15. What "done" looks like (Friday morning)

- [ ] Mia scenario plays end to end on `localhost:3000` and on the Vercel URL.
- [ ] All 4 channels visible: push notification, lock-screen widget mock, homescreen banner mock, in-app card.
- [ ] Three GenUI registers visibly differ in color, imagery, copy register.
- [ ] Context chips render on the offer card showing at least 2 active signals.
- [ ] Dismiss flow works: swipe → toast → no re-prompt for 24h → counted in merchant decline stats.
- [ ] Merchant dashboard updates live as offers fire (via SSE / Redis pub/sub). Inventory pulse buttons functional.
- [ ] Demo controls panel can force-trigger any rule, set behavioral signal, toggle inventory pulses.
- [ ] Redis is the only persistence layer. No SQLite, no Prisma.
- [ ] Prompt caching enabled on the offer engine system prompt.
- [ ] `getOrFetch` SWR helper used for every external API read.
- [ ] `.env.local.example` checked in, README has a 90 second setup section.
- [ ] 90 second video recorded. All 4 UX pillars named on camera.
- [ ] Architecture diagram in README.
- [ ] Privacy callout in README and on the offer card UI.
- [ ] Section 16 coverage matrix all green.

If all of the above are checked, we ship.

---

## 16. Brief requirements coverage matrix

Self-audit. Every numbered requirement from the brief mapped to where we satisfy it. Use this before submission to make sure no graded item is missed.

### Module requirements

| # | Brief requirement | Where it lives | Status |
|---|---|---|---|
| M1.1 | Aggregate real-time context signals | `lib/context/aggregator.ts` | ✓ |
| M1.1b | Geo-fencing for location triggers | `lib/maps/geofence.ts` (point-in-polygon) + `location.inZone` rule predicate | ✓ |
| M1.2 | Recognize composite context state | `lib/triggers.ts` (multi-condition rule eval) | ✓ |
| M1.3 | Configurable without code change | `config/cities/*.yaml` + `lib/config/loader.ts` + `EventsProvider` interface | ✓ |
| M1.4 | At least 2 context categories visible to user | `components/consumer/ContextChips.tsx` | ✓ |
| M2.1 | Generated dynamically, not from static DB | `app/api/offer/generate/route.ts` (Claude tool use) | ✓ |
| M2.2 | GenUI techniques (imagery, tone, framing) | `components/gen-ui/*` registry + curated imagery | ✓ |
| M2.3 | Merchant rule interface (even mockup) | `app/(merchant)/rules/page.tsx` | ✓ |
| M2.4 | On-device privacy posture | `lib/intent/classifier.ts` + chip on offer card | ✓ |
| M3.1 | End-to-end flow demonstrated | Demo scenario scenes 1–8 | ✓ |
| M3.2 | Dynamic QR or token validated via API | `app/api/redeem/{token,validate}/route.ts` | ✓ |
| M3.3 | Consumer view + merchant view | `app/(consumer)/*` + `app/(merchant)/*` | ✓ |
| M3.4 | Merchant dashboard with accept/decline aggregate | `app/(merchant)/page.tsx` + `MerchantStats` | ✓ |

### Data sources from the brief

| Brief mentions | What we use | Notes |
|---|---|---|
| OpenWeatherMap / DWD | OpenWeatherMap | Server-side fetch, 10 min cache |
| Eventbrite / Local event APIs | Ticketmaster Discovery API | Eventbrite public search was deprecated in 2019; we abstract behind `EventsProvider` so Eventbrite slots in via config when an org token exists |
| Google Maps Platform / OSM | Google Maps Static + Geocoding | Mapbox + OSM Nominatim is the documented fallback if Google Cloud billing is friction |
| Simulated Payone transaction feed | Generated stream | Brief explicitly marks Payone as a DSV asset to simulate |
| On-device SLMs (Phi-3, Gemma) | Rule-based classifier with documented swap path | `@xenova/transformers` is in stretch |
| React Native / Flutter GenUI | Server-streamed React components per `register` | Web stack, brief explicitly lists web frameworks |

### UX requirements (the four explicit questions)

| # | Brief question | Our answer | Where |
|---|---|---|---|
| UX1 | Where does the interaction happen? | Four channels: push, lock-screen widget, homescreen banner, in-app card | Scene 2 of demo |
| UX2 | How does the offer address the user? | Register selected by model based on context (emotional vs factual vs playful vs quiet-premium) | Scene 3 of demo + `gen-ui/registry` |
| UX3 | What happens in the first 3 seconds? | 5-word headline, 3 context chips, 1 CTA, no scrolling | Scene 4 of demo + `OfferCard` layout |
| UX4 | How does the offer end? | Three intentional paths: accept (redeem), expire (countdown), dismiss (24h suppression + decline counter) | Scene 7 of demo + `DismissSheet` |

### "Strong submission" criteria

| Criterion | Our claim |
|---|---|
| Real context in action | Composite trigger (rain + quiet + fresh batch) shown in scene 1 |
| 3-second comprehension | Layout enforced by `OfferCard` constraints + prompt rules (≤8 word headline) |
| Closed loop | Scenes 1–8 walk context → trigger → generation → display → accept/dismiss → checkout → merchant view |
| Honest privacy | On-device intent + behavioral signals; only label crosses wire; chip visible on offer card; documented in README |

### Mia's story coverage (every signal mentioned in the brief's narrative)

| Signal in brief | How we surface it |
|---|---|
| 11°C, overcast | Weather signal, drives `warm_emotional` register |
| Café 80m away, quiet morning | Demand signal (transactions per hour ratio) |
| Just brewed a fresh batch | Inventory pulse (`MerchantPulse`) |
| Stopped twice in 10 minutes | Behavioral signal (`'stationary'`) |
| Browsing not commuting | Behavioral signal feeds intent classifier |
| Has responded to warm-drink offers before | Intent classifier preference history (browser-local) |

If every cell above is honest, we are aligned with the brief.
