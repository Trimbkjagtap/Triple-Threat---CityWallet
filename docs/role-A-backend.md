# Slot A — Backend / Context Lead

> Branch: `feat/context`
> You own the data and the rules. Nothing the user sees is real without you.

## What you own

| Surface | What lives there |
|---|---|
| `lib/cache/**` | Redis client, SWR helper, key builders |
| `lib/context/**` | Weather, simulated Payone stream, inventory pulses, aggregator |
| `lib/events/**` | Ticketmaster impl + Eventbrite stub behind a provider interface |
| `lib/maps/**` | Google + OSM impls, distance, geofence (point-in-polygon) |
| `lib/config/**` | YAML loader |
| `app/api/context/**` | `/api/context/state` — the single endpoint everyone consumes |
| `app/api/redeem/**` | Token mint + validate |
| `app/api/merchant/{stats,pulse}/**` | Aggregate metrics + inventory pulse posting |
| `lib/triggers.ts` | YAML rule evaluator |
| `config/cities/stuttgart.yaml` | Merchants, neighborhoods, rules, events |
| `fixtures/` | API response snapshots for `DEMO_MODE=true` |

You don't touch: anything in `app/(consumer)`, `app/(merchant)`, `components/**`, `lib/prompt/**`, `lib/intent/**`, `lib/types/api.ts` (frozen after H2).

## Read first (15 min)

- `PLAN.md` §3 (stack), §7A (your spec), §8 (the API contract you produce), §11 (cache topology — this is your spine), §12 (env vars).
- `BUILD_PLAN.md` §3A (your hour-by-hour), §8 (risks).

## Setup

```bash
git pull origin main
git checkout feat/context
pnpm install
cp .env.local.example .env.local
```

Keys you need in `.env.local`:

```
OPENWEATHER_API_KEY=...           # https://openweathermap.org (free tier)
TICKETMASTER_API_KEY=...          # https://developer.ticketmaster.com (free, 5000/day)
GOOGLE_MAPS_API_KEY=...           # Static Maps + Geocoding APIs enabled, restrict to localhost + Vercel domain, set daily cap
OSM_USER_AGENT=city-wallet-hackathon/1.0 (your-email@example.com)
KV_REST_API_URL=...               # auto-injected by Upstash Vercel integration
KV_REST_API_TOKEN=...
# OR for local dev only:
# REDIS_URL=redis://localhost:6379
DEMO_MODE=false                   # flip to true when recording video
```

You don't need `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for your branch — leave them blank.

Smoke test you're ready: `pnpm dev` boots, `curl localhost:3000/api/context/state` returns the 501 stub.

## Hour by hour (H2 → H10)

### H2–H3 · Cache foundation

Two files. Everything downstream depends on these.

**`lib/cache/redis.ts`** — Upstash client wrapper + the `getOrFetch` SWR helper.

```ts
import { Redis } from '@upstash/redis';

export const redis = Redis.fromEnv();             // reads KV_REST_API_URL + KV_REST_API_TOKEN

export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshSec: number,
  staleSec: number,
): Promise<T> {
  const cached = await redis.get<{ data: T; freshUntil: number; staleUntil: number }>(key);
  const now = Date.now();
  if (cached && now < cached.freshUntil) return cached.data;
  if (cached && now < cached.staleUntil) {
    revalidateInBackground(key, fetcher, freshSec, staleSec);
    return cached.data;
  }
  return await fetchAndStore(key, fetcher, freshSec, staleSec);
}
```

`revalidateInBackground` should fire-and-forget — do **not** await it. `fetchAndStore` writes the new envelope `{ data, freshUntil, staleUntil }` and returns the data.

**`lib/cache/keys.ts`** — typed builders for every key from `PLAN.md` §11.

```ts
export const k = {
  weather: (cityKey: string) => `wx:v1:${cityKey}`,
  events: (cityKey: string) => `ev:v1:${cityKey}`,
  geocode: (hash: string) => `geo:v1:${hash}`,
  staticMap: (centerHash: string, zoom: number) => `map:v1:${centerHash}:${zoom}`,
  payone: (merchantId: string, epochHour: number) => `pay:v1:${merchantId}:hour:${epochHour}`,
  pulse: (merchantId: string) => `pulse:v1:${merchantId}`,
  offer: (offerId: string) => `offer:v1:${offerId}`,
  token: (token: string) => `tok:v1:${token}`,
  rules: (merchantId: string) => `rules:v1:${merchantId}`,
  stats: (merchantId: string, kind: string) => `stats:v1:${merchantId}:${kind}`,
  feed: (merchantId: string) => `feed:v1:${merchantId}`,
};
```

No raw cache strings anywhere else in the repo. If you want to add one, add it here first.

### H3–H4 · Weather, distance, geofence, YAML

**`lib/context/weather.ts`** — fetch OpenWeatherMap by city, normalize to `ContextState['weather']`. Wrap in `getOrFetch` with `freshSec=600, staleSec=3600`.

**`lib/maps/distance.ts`** — pure haversine. No deps.

```ts
export function distanceMeters(a: {lat: number, lng: number}, b: {lat: number, lng: number}): number { ... }
```

**`lib/maps/geofence.ts`** — pure point-in-polygon (ray casting). Inputs: `(point, polygon)`. Returns boolean. Used by aggregator to populate `ContextState.location.inZones`.

**`lib/config/loader.ts`** — `loadCity(cityKey: string): CityConfig`. Reads `config/cities/${cityKey}.yaml`, parses with `js-yaml`, returns typed object. Cache the parsed result in module scope.

### H4–H5 · Simulated Payone stream

**`lib/context/payone.ts`** — generator. For each merchant, simulate `transactionsPerHour` and `weeklyAvg`.

- Seeded random walk per merchant (so values are stable within a session).
- Daily seasonality: low at 10–11am and 14–16, high at 12–13 and 18–19.
- `forceQuiet(merchantId: string, ratio: number)` override exposed for the demo.
- Cache per merchant per hour bucket: key `pay:v1:{merchantId}:hour:{epochHour}`, fresh 5 min, stale 15 min.

The `ratio = transactionsPerHour / weeklyAvg` is what the trigger checks (`demand.self: { lt: 0.6 }`).

### H5–H6 · Inventory pulses

**`lib/context/inventoryPulse.ts`** — `addPulse(merchantId, kind, label, ttlMinutes)` writes to Redis at `pulse:v1:{merchantId}` with TTL. `getPulses(merchantIds)` reads them. Auto-expires via Redis TTL.

**`app/api/merchant/pulse/route.ts`** — POST handler. Body matches `MerchantPulsePost` from `lib/types/api.ts`. Writes via `addPulse`. Publishes to `pulse:fired:{merchantId}` Redis pub/sub channel for the merchant dashboard's live feed (this powers SSE in §11).

### H6–H7 · Events

**`lib/events/provider.ts`** — interface:

```ts
export interface EventsProvider {
  list(cityKey: string): Promise<EventInfo[]>;
}
```

**`lib/events/ticketmaster.ts`** — default impl. `GET https://app.ticketmaster.com/discovery/v2/events.json?city=Stuttgart&countryCode=DE&radius=5&unit=km&apikey=...`. Map response to `EventInfo[]` with `distanceMeters` and `startsInMinutes` (compute against now).

**`lib/events/cache.ts`** — wrap `provider.list(cityKey)` in `getOrFetch` with `freshSec=3600, staleSec=21600`. On first successful call, also write a snapshot to `fixtures/events.json` so `DEMO_MODE=true` can fall back. Read from the fixture if `DEMO_MODE=true` and the fetch throws or times out (>3s).

**`lib/events/eventbrite.ts`** — stub. Throws `new Error('Eventbrite not configured — set EVENTBRITE_ORG_TOKEN')`. Documents the swap path.

### H7–H8 · Maps

**`lib/maps/provider.ts`** — interface:

```ts
export interface MapsProvider {
  staticMapUrl(args: { center: {lat: number, lng: number}; zoom: number; size: string }): string;
  geocode(address: string): Promise<{lat: number, lng: number} | null>;
}
```

**`lib/maps/google.ts`** — Static Maps + Geocoding API. Server-side only. Cache geocode forever (`geo:v1:{addressHash}`), static map URLs forever (`map:v1:...`).

**`lib/maps/osm.ts`** — Nominatim geocoding (1 req/sec, requires `User-Agent` header). Static tile fallback URL pattern.

Selection: read `MAPS_PROVIDER` env var, default `google`. Export a `getMaps()` helper.

### H8–H9 · Aggregator + triggers

**`lib/context/aggregator.ts`** — the heart of your branch.

```ts
export async function aggregate(args: {
  userId: string;
  lat: number;
  lng: number;
  cityKey: string;
  intentHint: ContextState['intentHint'];
  behavioral: ContextState['behavioral'];
}): Promise<ContextState> {
  const cfg = loadCity(args.cityKey);

  const [weather, events, demand, pulses] = await Promise.all([
    getWeather(args.cityKey),
    getEvents(args.cityKey),
    getDemand(cfg.merchants.map(m => m.id)),
    getPulses(cfg.merchants.map(m => m.id)),
  ]);

  const inZones = cfg.neighborhoods
    .filter(n => pointInPolygon({lat: args.lat, lng: args.lng}, n.polygon))
    .map(n => n.id);

  return { /* assemble ContextState */ };
}
```

**`lib/triggers.ts`** — evaluate rules from YAML against state. Return highest-priority matching `Trigger`. Predicates you must support:

- `weather.condition: [...]` (membership)
- `weather.tempC: { lt|gt|lte|gte: N }`
- `demand.self: { lt|gt: ratio }`
- `time.dayOfWeek: [...]`
- `time.hour: { gte: N, lt: M }`
- `pulse.{kind}: true` (e.g. `pulse.fresh_batch`)
- `event.within: { meters: N, startsInMinutes: { lt: N } }`
- `location.inZone: zoneId`

Compile rules to a tree once, evaluate per request. `firedSignals` lists which conditions matched — feed into `Trigger.firedSignals` so the consumer card knows which chips to render.

**`app/api/context/state/route.ts`** — POST handler. Body: `{ userId, lat, lng, cityKey, intentHint, behavioral }`. Calls `aggregate()` then `evaluateTriggers()`. Returns `ContextResponse`.

### H9–H10 · Redemption + merchant stats

**`app/api/redeem/token/route.ts`** — POST `{ offerId }`. Mints a UUID token. Stores at `tok:v1:{token}` with the offer payload + `expiresAt`. Returns `RedeemTokenResponse` (`token`, `qrPayload`, `expiresAt`).

**`app/api/redeem/validate/route.ts`** — POST `{ token }`. Use Redis `SET key value NX EX ttl` (or `SETNX` + `EXPIRE`) on a separate `tok:redeemed:{token}` lock to prevent double-redeem. If lock acquired, increment `stats:v1:{merchantId}:redeemed`. Return `ValidateResponse`.

**`app/api/merchant/stats/route.ts`** — GET `?merchantId=...`. Reads counters via `redis.mget`. Pulls last 100 from `feed:v1:{merchantId}` LIST. Returns `MerchantStats`.

Stats counters get incremented from:
- `accepted` / `dismissed` / `expired` — incremented from a small `app/api/offer/action/route.ts` POST you also need (handles `OfferAction`). Frontend posts to it from `OfferCard` and `DismissSheet`.
- `generated` — incremented by B inside `/api/offer/generate` after the stream completes. Coordinate via the Redis key constant.
- `redeemed` — incremented in `validate/route.ts`.

`acceptanceRate = accepted / generated`.

### H10 · Smoke + PR

```bash
# in another terminal with .env.local loaded
curl -s -X POST localhost:3000/api/context/state \
  -H 'Content-Type: application/json' \
  -d '{"userId":"u1","lat":48.7762,"lng":9.1822,"cityKey":"stuttgart","intentHint":"warm_drink_seeking","behavioral":"stationary"}' | jq

curl -s -X POST localhost:3000/api/merchant/pulse \
  -H 'Content-Type: application/json' \
  -d '{"merchantId":"m_cafe_mueller","kind":"fresh_batch","label":"Just brewed","ttlMinutes":30}' | jq

curl -s 'localhost:3000/api/merchant/stats?merchantId=m_cafe_mueller' | jq
```

Open PR. Self-review allowed but request a quick eyeball from B or C.

## What you produce (consumed by B and C)

| Endpoint | Consumer | Shape (in `lib/types/api.ts`) |
|---|---|---|
| `POST /api/context/state` | C polls; B reads on offer generation | `ContextResponse` |
| `POST /api/offer/action` | C posts on accept/dismiss/expire | `{ ok: true }` |
| `POST /api/redeem/token` | C posts when user taps "Use offer" | `RedeemTokenResponse` |
| `POST /api/redeem/validate` | C polls from `RedeemView` | `ValidateResponse` |
| `GET /api/merchant/stats` | C polls in dashboard | `MerchantStats` |
| `POST /api/merchant/pulse` | C posts from pulse buttons | `{ ok: true }` |

## What you mock

You shouldn't need to mock anything — your branch is a pure leaf. The Anthropic call (`/api/offer/generate`) is B's, but you can leave its 501 stub in place; C will reach for it post-merge.

## Demo affordances you must build

- `forceQuiet(merchantId)` override callable from the demo controls panel (C will wire it via a query param or a `?demoQuiet=m_cafe_mueller` flag in the context endpoint).
- `DEMO_MODE=true` flag: when set, your fetchers prefer fixtures over live API calls if a live call fails or is slow (>3s).

## Integration day (H10–H12)

- Open the PR. Run the smoke suite above on the Vercel preview.
- B will rebase onto your merged main and swap their hardcoded `MOCK_MIA_CONTEXT` for a real `fetch('/api/context/state', ...)`. If they hit shape mismatches, that's on you to fix.
- C will rebase, flip context-side `MOCK=true` to `false` in `lib/api-client.ts`. Sit with C for 10 min on the preview to confirm chips populate from real signals.
- Watch Upstash dashboard: confirm cache hit ratio rises after first call to each cityKey.

After H12, your only job is hardening: pre-warm route at `app/api/_warm/route.ts`, fixtures coverage, retry/timeout on external APIs.

## Definition of done (your slot)

- [ ] `lib/types/api.ts` shapes returned by every endpoint, no drift.
- [ ] `getOrFetch` wraps every external API read.
- [ ] `lib/cache/keys.ts` is the only place cache keys are constructed.
- [ ] `stuttgart.yaml` has 4–5 merchants, 1+ rule per merchant, polygon for Altstadt.
- [ ] Geofence predicate `location.inZone` works (smoke: move user out of polygon, rule stops firing).
- [ ] Redemption is single-use (smoke: validate twice, second call returns `valid: false`).
- [ ] Merchant stats counters increment on action posts.
- [ ] `DEMO_MODE=true` works without network if `fixtures/` is populated.
- [ ] `pnpm build` clean, no TypeScript errors.
- [ ] PR merged, Vercel preview green.
