This is a hackathon project. Move fast. Skip tests unless logic is non-trivial.

Stack: Next.js 16.2, TypeScript strict, Tailwind v4 utility classes only, shadcn primitives, no inline styles.

LLM: Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`). All model calls go through `lib/prompt/model.ts` which reads `LLM_PROVIDER` from env. Default is `anthropic` with `claude-sonnet-4-6`. Use `streamObject` + Zod schema for structured output, never the raw provider SDK. Mark the system prompt with `cacheControl: { type: 'ephemeral' }` via `providerOptions.anthropic` for prompt caching.

Persistence: Redis only (no Prisma, no SQLite). All state goes through `lib/cache/redis.ts`. Keys are defined in `lib/cache/keys.ts`; never construct cache keys inline.

Caching: every external read goes through `getOrFetch` (stale-while-revalidate). Two TTLs per key: fresh and stale.

Maps: `lib/maps/provider.ts` is the interface. `lib/maps/google.ts` and `lib/maps/osm.ts` are the implementations. Selection by env `MAPS_PROVIDER`.

Events: `lib/events/provider.ts` is the interface. `lib/events/ticketmaster.ts` is the default. Eventbrite is a stub (deprecated public search since 2019).

Geofencing: `lib/maps/geofence.ts` does point-in-polygon. Used to populate `ContextState.location.inZones`. Powers the `location.inZone` rule predicate.

Never hardcode merchants, rules, or city parameters in code. They live in `config/cities/*.yaml`.

Never generate offers outside `lib/prompt/`. The model is the source of creativity.

Never invent context signals. The user only ever sees signals that flowed through `lib/context/aggregator.ts`.

GenUI registers are an enum. Adding a register means: a new entry in `registry.ts` AND a new primitive component AND a system prompt update.

Privacy: anything user-personal (history, preferences, raw GPS) stays in the browser. Only `Offer` + `intentHint` + `behavioral` label cross the wire.

Streaming: `/api/offer/generate` uses `streamObject` to stream the offer object as it fills in. `/api/context/stream` is SSE. Use `ReadableStream` in App Router route handlers.

API contract: `lib/types/api.ts` is frozen. Schema changes require a 3-person ack in chat.

Branch ownership:
- `feat/context` (slot A): `lib/cache/**`, `lib/context/**`, `lib/events/**`, `lib/maps/**`, `lib/config/**`, `app/api/context/**`, `app/api/redeem/**`, `app/api/merchant/{stats,pulse,rules}/**`, `lib/triggers.ts`, `config/cities/**`, `fixtures/**`.
- `feat/genui` (slot B): `lib/prompt/**`, `lib/intent/**`, `app/api/offer/generate/**`, `components/gen-ui/**`, `public/img/imagery/**`.
- `feat/frontend` (slot C): `app/(consumer)/**`, `app/(merchant)/**`, `components/consumer/**`, `components/merchant/**`, `lib/api-client.ts`, Tailwind theme, demo controls.

Don't edit another slot's surface area without a heads-up in the team channel.
