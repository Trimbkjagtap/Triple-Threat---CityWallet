# City Wallet

**A real-time context layer for local commerce.** Offers don't exist until they're needed — generated for *this* user, *this* minute, *this* café two blocks away.

> Built for **DSV-Gruppe × Hack-Nation Challenge 01** — *Generative City-Wallet*.
> In collaboration with MIT Club of Northern California and MIT Club of Germany.

🌐 **Live demo**: <https://triple-threat-city-wallet.vercel.app>
📱 Consumer: `/` · Merchant dashboard: `/merchant` · Rule editor: `/merchant/rules`

---

## What it is

Mia, 28, walks through Stuttgart's Altstadt on a cold Tuesday afternoon. The system knows it's 3 °C, that Café Müller 80 m away has been quiet all morning and just brewed a fresh batch, and that Mia is browsing — not commuting. It generates *one* offer for *this* moment: a warm-emotional card, a five-word headline, a 15 % discount valid for 20 minutes. The merchant set a goal ("fill quiet hours"); the AI did the rest.

That gap — between a person and a perfectly relevant local offer two minutes from where they're standing — is what City Wallet closes. Not a coupon database. Not static discounts. **Offers generated on the fly, grounded in real signals: weather, time, location, events, demand, inventory.**

DSV Gruppe sits at the intersection of payments (Payone), merchant portals (S-Markt & Mehrwert), and Sparkassen's regional banking relationships. City Wallet is the AI layer that turns that triangle into something Amazon cannot replicate: hyperlocal demand response, on the corner, in the neighborhood, on a Tuesday.

---

## The Mia loop, in one paragraph

Merchant taps "Fresh batch" → Redis pulse with 30 min TTL. Consumer's phone polls `/api/context/state` → aggregator pulls weather (OpenWeatherMap), events (Ticketmaster), demand (simulated Payone stream), pulses, runs point-in-polygon geofence, evaluates the YAML rule engine. A composite trigger fires (`weather.condition: drizzle ∧ demand.self < 0.6 ∧ pulse.fresh_batch ∧ location.inZone: altstadt`). `/api/offer/generate` calls Claude Sonnet 4.6 via Vercel AI SDK with structured output, picks one of four GenUI registers, streams the offer back. Consumer renders progressively, shows context chips above the headline (the brief's "≥ 2 visible signals"), tap "Use offer" mints a single-use UUID token. Merchant scans, `/api/redeem/validate` acquires a Redis `SETNX` lock, increments counters. Dismissal toasts "won't see this for 24 h" and persists in `localStorage`. End to end in under 60 s, every signal real except Payone (per the brief).

---

## Architecture

```mermaid
flowchart LR
    Consumer["📱 Consumer<br/>app/(consumer)"]
    Merchant["🏪 Merchant<br/>app/merchant"]

    subgraph Vercel["Vercel Functions (Next.js 16)"]
        ContextAPI[/api/context/state/]
        OfferAPI[/api/offer/generate/]
        RedeemAPI[/api/redeem/token<br/>/api/redeem/validate]
        MerchantAPI[/api/merchant/stats<br/>/api/merchant/pulse<br/>/api/merchant/rules]
        Maps[/api/maps/static-url/]
    end

    subgraph Aggregator["lib/ — server"]
        Agg[context/aggregator]
        Triggers[triggers.ts<br/>YAML rule engine]
        Geofence[maps/geofence<br/>point-in-polygon]
        Cache[cache/redis<br/>SWR getOrFetch]
        Prompt[prompt/<br/>schema + systemPrompt]
        OfferStore[context/offerStore]
    end

    subgraph External["External APIs"]
        OWM[OpenWeatherMap]
        Ticketmaster[Ticketmaster<br/>Discovery API]
        Anthropic[Anthropic<br/>Claude Sonnet 4.6]
        GMaps[Google Maps<br/>Static Maps API]
    end

    Upstash[(Upstash Redis<br/>cache · counters · pulses<br/>tokens · feed)]

    Consumer -->|polls every 5s| ContextAPI
    Consumer -->|streams| OfferAPI
    Consumer --> RedeemAPI
    Consumer --> Maps
    Merchant -->|polls every 2.5s| MerchantAPI

    ContextAPI --> Agg
    Agg --> Geofence
    Agg --> Triggers
    Agg --> Cache
    Cache --> OWM
    Cache --> Ticketmaster
    Cache --> Upstash

    OfferAPI --> Prompt
    OfferAPI --> Anthropic
    OfferAPI -.->|onFinish| OfferStore
    OfferStore --> Upstash

    RedeemAPI --> Upstash
    MerchantAPI --> Upstash
    Maps --> GMaps
```

Every external read goes through `getOrFetch` (stale-while-revalidate, fresh + stale TTLs). Anthropic prompt caching is enabled on the system prompt (`cacheControl: ephemeral`) — ~90 % cost reduction, ~50 % latency cut after the first call.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + backend | Next.js 16.2 (App Router), TypeScript strict, Tailwind v4, shadcn primitives | Single repo, single deploy, three teammates hot-reload the same thing |
| LLM | Vercel AI SDK + `@ai-sdk/anthropic` (default) / `@ai-sdk/openai` (fallback) | Provider-agnostic; `streamObject` + Zod for structured output works against either |
| Persistence | Upstash Redis via `@upstash/redis` HTTP client | Serverless-native (no TCP connection pool), free tier covers our traffic ~100×, supports atomic `INCR` + `SETNX` for counters and single-use locks |
| Context APIs | OpenWeatherMap, Ticketmaster Discovery API | Free tiers, real Stuttgart data |
| Maps | Google Maps Static + Geocoding (default) or OSM Nominatim (fallback), behind a `MapsProvider` interface | Brief calls Google out by name; OSM is the safety valve. Map URL minted server-side so the API key never ships to the client. |
| Transactions | Simulated Payone stream | Brief explicitly marks Payone as a DSV asset to simulate |
| QR | `qrcode` npm package | One-liner, scannable |
| City config | YAML in `config/cities/*.yaml` | Brief: "configurable without code change" |
| Deploy | Vercel | Free, fast, one command |

---

## Brief coverage

Every numbered requirement from the challenge document mapped to where it lives.

### Module requirements

| # | Brief requirement | Where |
|---|---|---|
| **M1.1** | Aggregate real-time context signals | `lib/context/aggregator.ts` |
| **M1.1b** | Geo-fencing | `lib/maps/geofence.ts` (point-in-polygon) + `location.inZone` predicate |
| **M1.2** | Recognize composite context state | `lib/triggers.ts` (multi-condition rule eval) |
| **M1.3** | Configurable without code change | `config/cities/*.yaml` + `lib/config/loader.ts` + `EventsProvider` / `MapsProvider` interfaces |
| **M1.4** | At least 2 context categories visible to user | `components/consumer/ContextChips.tsx` (always rendered above headline) |
| **M2.1** | Generated dynamically, not from static DB | `app/api/offer/generate/route.ts` (Anthropic `streamObject` + Zod) |
| **M2.2** | GenUI techniques (imagery, tone, framing) | `components/gen-ui/` — 4 register primitives + curated imagery enum |
| **M2.3** | Merchant-side rule interface | `app/merchant/rules/page.tsx` (form + persistence) |
| **M2.4** | On-device privacy posture | `lib/intent/classifier.ts` (browser-side) + privacy chip on offer card |
| **M3.1** | End-to-end flow demonstrated | Full Mia loop running on production URL |
| **M3.2** | Dynamic QR/token validated via API | `app/api/redeem/{token,validate}/route.ts` (`SETNX` single-use lock) |
| **M3.3** | Consumer + merchant view | `app/(consumer)` + `app/merchant` |
| **M3.4** | Merchant dashboard with accept/decline aggregate | `app/merchant/page.tsx` (`StatsGrid` + `LiveFeed` + `PulseButtons`) |

### UX requirements (the four explicit questions)

| # | Brief question | Our answer | Where |
|---|---|---|---|
| **UX1** | Where does the interaction happen? | Four channels: push notification, lock-screen widget, homescreen banner, in-app card | `components/consumer/{PushNotification,LockScreen,HomescreenBanner,OfferCard}.tsx` |
| **UX2** | How does the offer address the user? | Register selected by the model based on context: `warm_emotional` / `factual_urgent` / `playful_energetic` / `quiet_premium` | `lib/prompt/systemPrompt.ts` + `components/gen-ui/registry.tsx` |
| **UX3** | What happens in the first 3 seconds? | ≤ 8-word headline + 2–4 context chips + 1 CTA, no scrolling | `components/consumer/OfferCard.tsx` + Zod schema char limits |
| **UX4** | How does the offer end? | Three intentional paths: accept (mint + redeem), expire (countdown), dismiss (sonner toast + 24 h `localStorage` suppression + decline counter) | `app/(consumer)/page.tsx` `handleDismiss` + `RedeemView.tsx` countdown |

---

## Privacy posture (GDPR)

The brief explicitly asks: *"how does your system protect user data?"* Our answer is architectural, not just a checkbox.

- **Movement, history, and preferences never leave the device.** A classifier runs in the browser (`lib/intent/classifier.ts`) and produces a single label: `'warm_drink_seeking' | 'quick_lunch' | 'window_shopping' | 'commuting' | 'unknown'`.
- **Only that abstract label crosses the wire.** Every `/api/context/state` request includes `intentHint` and `behavioral` strings. Raw GPS, dwell times, redemption history, and weather sensitivity stay client-side in `localStorage` or memory.
- **Production swap path is documented.** Today, the classifier is a rule-based stub. The architecture supports swapping in an on-device SLM (Phi-3 Mini, Gemma 2B) via `@xenova/transformers` running in WebGPU — a one-line change in `lib/intent/classifier.ts`. The privacy contract (intent-only-on-wire) is real today; the model behind it is the upgrade path.
- **The privacy chip is visible on every offer card.** The consumer literally sees *"On-device intent: warm drink seeking"* — the only thing the system knows about them is the only thing they see.

The Sparkassen-DSV-Payone alignment makes this credible: a banking-adjacent product can't ship invasive telemetry. Honest privacy is the differentiator versus Google / Apple Wallet.

---

## Running locally

```bash
git clone https://github.com/Trimbkjagtap/Triple-Threat---CityWallet.git
cd Triple-Threat---CityWallet
pnpm install                              # node 20+, pnpm 10+
cp .env.local.example .env.local          # then fill in keys (see below)
pnpm dev                                  # http://localhost:3000
```

### Required env vars

| Var | What | How to get |
|---|---|---|
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) | Upstash Redis credentials | <https://console.upstash.com> · free tier, 256 MB |
| `OPENWEATHER_API_KEY` | Real Stuttgart weather | <https://openweathermap.org> · free, takes ~2 h to activate |
| `TICKETMASTER_API_KEY` | Stuttgart events | <https://developer.ticketmaster.com> · free, 5 000 calls/day |
| `ANTHROPIC_API_KEY` | Offer generation | <https://console.anthropic.com> · ~$0.005/offer with caching, $5 covers ≥ 500 offers |
| `GOOGLE_MAPS_API_KEY` | Static Maps + Geocoding | Google Cloud Console · free $200/month credit |
| `LLM_PROVIDER=anthropic` | Provider toggle | Set to `openai` to use OpenAI as fallback |
| `MAPS_PROVIDER=google` | Maps provider toggle | Set to `osm` for keyless OSM Nominatim |
| `DEMO_MODE=true` | Honors demo controls' force-trigger / force-quiet overrides | Set `false` for normal user-facing context evaluation |
| `NEXT_PUBLIC_MOCK=false` | Frontend mock toggle | `true` lets `lib/api-client.ts` return fixtures (useful in early-integration dev) |

### Smoke test

```bash
pnpm smoke                                  # localhost
BASE_URL=https://your-deploy.vercel.app pnpm smoke
```

Covers `/api/warm`, pulse persistence, trigger evaluation, validation paths, merchant stats. Codifies the Mia loop sanity check.

### Demo controls

Append `?demo` to the consumer URL — `http://localhost:3000/?demo` — to mount the dev panel. Force a trigger by name, override behavioral signal, toggle inside-zone, force a merchant into quiet demand, jump to any view directly. Critical for video re-shoots.

---

## Deployment

Vercel + Upstash, both free tiers.

```bash
npm i -g vercel
vercel link                                  # interactive
vercel env add ANTHROPIC_API_KEY production preview development   # repeat for each var
vercel --prod
```

Or use the Vercel dashboard's **Settings → Environment Variables → Import .env** to paste the whole `.env.local` at once.

Production URL pattern: `https://triple-threat-city-wallet.vercel.app`. Vercel auto-deploys every push to `main`; PRs get preview deployments.

---

## What's deferred / known gaps

| Item | Why deferred |
|---|---|
| **`/api/context/stream` SSE** | Brief allows polling for M3.4. Polling `/api/merchant/stats` every 2.5 s gives the same UX. Vercel Hobby's 10 s function timeout makes long-lived SSE awkward. |
| **Real WebGPU SLM (Phi-3 Mini)** | Privacy posture is honored architecturally with the rule-based stub. Real model swap is a `lib/intent/classifier.ts` rewrite — documented as the production path. |
| **Apple Wallet pass generation** | Apple Developer Program ($99 / yr) + signing cert required. Out of hackathon scope. |
| **Cashback redemption** | Brief allows QR *or* cashback. QR is more demo-visible; the `validate` API stays the same shape if cashback is layered on later. |
| **Animated user walk path** | The demo controls' `?demo` panel can manually shift `lat/lng` to simulate movement; an automated walk-path animation is polish for the video. |
| **Multi-language offers** | Anthropic supports it natively; not yet wired through the prompt + UI toggle. ~5 min addition. |

---

## Team

| Name | Role | Surface |
|---|---|---|
| **Vivek Aher** | Backend / Context lead | Cache layer, context aggregator, trigger engine, redemption + merchant endpoints, simulated Payone, events provider, maps provider, geofencing, smoke script |
| **Trimbkeshwar Jagtap** | AI / GenUI lead | Prompt design, Zod schema, four GenUI primitives, intent classifier, movement signal, curated imagery |
| **Nidhi Lade** | Frontend / UX lead | Phone frame, lock screen, push notification, offer card, redeem view, consumer state machine, typed API client |

The full slot allocation, hour-by-hour schedule, and integration phases are documented in [`PLAN.md`](./PLAN.md) and [`BUILD_PLAN.md`](./BUILD_PLAN.md). Per-slot onboarding lives in [`docs/role-A-backend.md`](./docs/role-A-backend.md), [`docs/role-B-genui.md`](./docs/role-B-genui.md), and [`docs/role-C-frontend.md`](./docs/role-C-frontend.md).

---

## Acknowledgements

- **DSV-Gruppe** for the challenge brief and the framing — the Sparkassen / Payone / S-Markt triangle is genuinely a moat that Amazon doesn't have.
- **Hack-Nation × MIT × DSV-Gruppe** organizers.
- **Anthropic** for Claude Sonnet 4.6 + prompt caching that made structured creative output cheap enough to ship.
- **Upstash, Vercel, Ticketmaster, OpenWeatherMap, Google Maps Platform** for the free-tier infrastructure.

---

*"It's a real-time context layer for local commerce. Not a coupon database."*
