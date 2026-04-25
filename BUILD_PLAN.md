# City Wallet — Build Plan (3-person parallel execution)

> Companion to `PLAN.md`. PLAN.md is the *what* and *why*. This file is the *who* and *when*.
> Time is measured in "hackathon hours" from kickoff (H0). Adjust to wall clock at the event.
>
> **For teammates:** start with [`docs/ROLES.md`](./docs/ROLES.md) for orientation, then go to your slot's checklist:
> [`docs/role-A-backend.md`](./docs/role-A-backend.md) · [`docs/role-B-genui.md`](./docs/role-B-genui.md) · [`docs/role-C-frontend.md`](./docs/role-C-frontend.md).

---

## 0. Roles

Pick once, do not swap mid-build.

| Code name | Role | Branch | Owns |
|---|---|---|---|
| **A** | Backend / Context lead | `feat/context` | `lib/cache/**`, `lib/context/**`, `lib/events/**`, `lib/maps/**`, `lib/config/**`, `app/api/context/**`, `app/api/redeem/**`, `app/api/merchant/{stats,pulse}/**`, `config/cities/stuttgart.yaml`, simulated Payone, fixtures |
| **B** | AI / GenUI lead | `feat/genui` | `lib/prompt/**`, `lib/intent/**`, `app/api/offer/generate/**`, `components/gen-ui/**`, curated imagery in `public/img/imagery/` |
| **C** | Frontend / UX lead (Vivek) | `feat/frontend` | `app/(consumer)/**`, `app/(merchant)/**`, `components/consumer/**`, `components/merchant/**`, Tailwind theme, demo controls panel, video reshoots |

**Hard rule:** nobody writes outside their surface area without a heads-up in the team channel + a follow-up PR comment tagging the owner.

---

## 1. Pre-flight (H-1, before kickoff)

All three:
- Read `PLAN.md` sections 1–3, 7 (your sub-section), 8, 11.
- Skim the other two roles' sections so you know what you're consuming/producing.
- Have keys ready: Anthropic, OpenAI (fallback), OpenWeatherMap, Ticketmaster, Google Maps. Throw them in 1Password / shared note.
- Local Redis running (`brew services start redis`) **or** Upstash account verified.

---

## 2. Phase 1 — Scaffolding (H0 → H2, A drives, B+C observe)

**Goal:** push a `main` that everyone can branch from with no merge conflicts on shared files.

A executes in order:

1. `pnpm create next-app@latest city-wallet` — TS, App Router, Tailwind, src/ disabled, import alias `@/*`.
2. Init shadcn: `pnpm dlx shadcn@latest init`. Add: `button card sheet dialog toast input label badge`.
3. Install runtime deps: `pnpm add ai @ai-sdk/anthropic @ai-sdk/openai zod qrcode @upstash/redis js-yaml`.
4. Install dev deps: `pnpm add -D @types/qrcode @types/js-yaml`.
5. Drop `CLAUDE.md` from `PLAN.md` §13 at repo root.
6. Commit `lib/types/api.ts` — copy every type from `PLAN.md` §8 verbatim. **This file is the contract. Treat it as frozen for the rest of the hackathon.** Schema changes require a 3-person ack in chat.
7. Commit `config/cities/stuttgart.yaml` with the example block from §7A plus 4 more merchants (cafe, bakery, bookshop, wine bar) so B and C have variety to demo.
8. Commit `.env.local.example` mirroring §12. No real keys.
9. Stub all route handlers (`app/api/**/route.ts`) returning `Response.json({ stub: true }, { status: 501 })`. This unblocks frontend mocking and makes the route file paths real.
10. Stub `lib/cache/redis.ts`, `lib/cache/keys.ts`, `lib/prompt/model.ts`, `lib/prompt/schema.ts` with TODO comments and exported placeholder symbols. **Empty exports only** — real impls land in feature branches.
11. Vercel: `vercel link`, install Upstash from the Vercel marketplace, confirm `KV_REST_API_URL` / `KV_REST_API_TOKEN` show up in the project's env.
12. Push to `main`. Open three branches off the same SHA: `git checkout -b feat/context`, push; same for `feat/genui` and `feat/frontend`.
13. Each person opens a draft PR within 30 min so CI runs are visible to the team.

**Exit criteria:** `pnpm dev` boots, all three branches pushed, draft PRs open, `lib/types/api.ts` merged to main.

---

## 3. Phase 2 — Parallel build against mocks (H2 → H10)

Everyone works against `lib/types/api.ts`. No cross-branch dependencies. If you need something the other branch hasn't shipped, fake it locally and mark with `// MOCK: replace post-merge`.

### 3A. A — feat/context

| Slot | Task | Output |
|---|---|---|
| H2–H3 | `lib/cache/redis.ts`: Upstash client wrapper + `getOrFetch` SWR helper from §11. Centralize TTL constants. | Importable cache primitive. |
| H2–H3 | `lib/cache/keys.ts`: every key pattern from §11 as typed builders (`weatherKey(cityKey)`, `pulseKey(merchantId)`, …). No magic strings anywhere downstream. | Typed key builders. |
| H3–H4 | `lib/context/weather.ts` (OpenWeatherMap, 10 min fresh / 60 min stale). `lib/maps/distance.ts` (haversine, no API). `lib/maps/geofence.ts` (point-in-polygon, no API — powers `location.inZone` predicate). `lib/config/loader.ts` (YAML → typed config). | Four small modules. |
| H4–H5 | `lib/context/payone.ts`: seeded random walk + daily seasonality + `forceQuiet(merchantId)` override for demo. | Simulated stream. |
| H5–H6 | `lib/context/inventoryPulse.ts`: write/read pulses with Redis TTL. `app/api/merchant/pulse/route.ts` POST handler. | Pulse channel live. |
| H6–H7 | `lib/events/provider.ts` interface + `lib/events/ticketmaster.ts` impl + `lib/events/cache.ts` (writes `fixtures/events.json` on first call). Stub `lib/events/eventbrite.ts` (throws "not configured"). | Real Stuttgart events. |
| H7–H8 | `lib/maps/provider.ts` + `lib/maps/google.ts` + `lib/maps/osm.ts`. Default to Google. | Map URL helper, Geocoding. |
| H8–H9 | `lib/context/aggregator.ts` with `Promise.all` over all signals (also runs geofence eval to populate `location.inZones`). `lib/triggers.ts` reading rules from YAML, supports `location.inZone` predicate, returns highest-priority `Trigger \| null`. `app/api/context/state/route.ts`: real impl. | `/api/context/state` works. |
| H9–H10 | `app/api/redeem/token/route.ts` (mint), `app/api/redeem/validate/route.ts` (single-use via `SETNX`), `app/api/merchant/stats/route.ts` (counters). | Closed loop primitives. |
| H10 | `curl` smoke test all endpoints. Mark PR ready for review. | PR green. |

**Mock A consumes from others:** none. A is a pure leaf.

### 3B. B — feat/genui

| Slot | Task | Output |
|---|---|---|
| H2–H3 | `lib/prompt/schema.ts`: `OfferSchema` Zod definition matching `Offer` in §8. `lib/prompt/model.ts`: `getModel()` reading `LLM_PROVIDER`. | Two tiny files. |
| H3–H4 | `lib/prompt/systemPrompt.ts` from §9. `lib/prompt/buildMessages.ts` serializer. | Prompt locked. |
| H4–H6 | `app/api/offer/generate/route.ts`: `streamObject` + Zod + `providerOptions.anthropic.cacheControl`. **Stub the input** with a hardcoded `ContextState` constant for now (call it `MOCK_MIA_CONTEXT`). Test with real Anthropic key. Eyeball the output. | Streaming offer generator runs against mock context. |
| H6–H7 | `lib/intent/classifier.ts` (rule-based MVP, browser-safe). `lib/intent/movement.ts` (5-min speed window). | Browser-side intent + movement. |
| H7–H8 | `components/gen-ui/registry.ts` (register name → component). `WarmEmotional.tsx`, `FactualUrgent.tsx`, `PlayfulEnergetic.tsx` (optional `QuietPremium.tsx` if time). Each accepts `{ offer: Offer }`. | 3 (4) primitives renderable in isolation. |
| H8–H9 | Curate 8–12 Unsplash images keyed to `imageryHint` enum values. Drop in `public/img/imagery/`. Build the hint → src resolver. | Imagery set live. |
| H9–H10 | Iterate on prompt: run 10–15 distinct contexts (mock weather/time/pulse permutations). Confirm registers and copy actually vary. Tighten the system prompt where the model drifts. | Prompt feels reliable. |
| H10 | PR ready. | |

**Mock B consumes from others:** mock `ContextState` literal. Swap for fetch post-merge.

### 3C. C — feat/frontend (Vivek)

| Slot | Task | Output |
|---|---|---|
| H2–H3 | Tailwind theme: iOS-ish color tokens, dark/light. `components/consumer/PhoneFrame.tsx` (390px wide, dynamic island, status bar, home indicator, map background slot). | Phone shell renders. |
| H3–H4 | `components/consumer/LockScreen.tsx`, `HomescreenBanner.tsx`. Static for now. | 2 of 4 channels visible. |
| H4–H5 | `components/consumer/PushNotification.tsx` with slide-down animation off the dynamic island. Tap → callback. | 3rd channel. |
| H5–H6 | `components/consumer/ContextChips.tsx` (icon + label, picks from `ContextChip[]`). `components/consumer/OfferCard.tsx` (chips above headline, GenUI primitive slot, CTA). Until B ships, render a placeholder primitive that just dumps the JSON. | Core card structure. |
| H6–H7 | `lib/api-client.ts`: typed wrappers for every endpoint, with a `MOCK=true` flag that returns fixture `ContextState` + `Offer` matching `lib/types/api.ts` exactly. | Mocked client. |
| H7–H8 | `app/(consumer)/page.tsx` glue: poll mock context every 5s, when `trigger` non-null fire push, after 2s populate lock screen + banner. Tap push → mount OfferCard. | Full consumer flow against mocks. |
| H8–H9 | `components/consumer/RedeemView.tsx` (QR via `qrcode`, countdown, polls validate). `components/consumer/DismissSheet.tsx` + 24h suppression in `localStorage`. | Accept + dismiss paths. |
| H9–H10 | Merchant dashboard skeleton: `app/(merchant)/page.tsx` with `LiveFeed`, `StatsGrid`, pulse buttons. `app/(merchant)/rules/page.tsx` minimal form. Demo controls panel (dev-only, behind `NODE_ENV !== 'production'` + a query param). | Merchant view + demo affordance. |
| H10 | PR ready. | |

**Mock C consumes from others:** fixture JSON in `lib/api-client.ts`. Swap to real `fetch` post-merge.

---

## 4. Phase 3 — Sequential merge (H10 → H18)

Order is non-negotiable: `feat/context` → `feat/genui` → `feat/frontend`. Each merge unblocks the next branch's swap-from-mock work.

### H10 → H12 — Merge `feat/context`

1. A: rebase on main, fix lint, request reviews from B+C (15-min review max — squash and merge).
2. A: deploy preview, post URL in chat. Run §16 endpoint smoke test on the preview.
3. B: rebase `feat/genui` on main. Replace `MOCK_MIA_CONTEXT` with `await fetch('/api/context/state', ...)` in a test page.
4. C: rebase `feat/frontend` on main. Flip `MOCK=true` to `false` for context calls only (keep offer mocked). Verify chips populate from real signals.
5. **Checkpoint:** all three pair for 10 min on the preview URL. Phone frame loads, context chips show real Stuttgart weather. Done? Move on.

### H12 → H14 — Stabilize context, smoke offer

1. C: visual polish on phone frame using *real* context data (often reveals layout bugs that mocks hide).
2. B: hammer the offer endpoint with real contexts; flag any prompt drift.
3. A: monitor Redis cache hit rates via Upstash dashboard. Confirm `getOrFetch` is actually caching.

### H14 → H16 — Merge `feat/genui`

1. B: rebase, request reviews, squash and merge.
2. C: rebase, flip `MOCK=false` for offer calls. Wire `streamObject` partial output to `OfferCard` so headline appears first, subline second, chips third — feels alive.
3. A: confirm prompt-cache hits show up after the second call.
4. **Checkpoint:** Mia scenario plays end-to-end against mocks for behavioral signal, real for everything else. Tap push → card streams in → QR mints → validate works.

### H16 → H18 — Merge `feat/frontend`

1. C: rebase, request reviews, squash and merge.
2. All three: open the Vercel preview. Run the 8-scene demo script from §6 top to bottom. Note every glitch in a shared list.
3. Triage glitches: critical (blocks demo) vs. polish vs. drop. Distribute fixes by surface area.

**Exit criteria for Phase 3:** Vercel preview plays the full Mia scenario without dev intervention.

---

## 5. Phase 4 — Polish (H18 → H22)

Each person owns their domain; no cross-edits without ping.

| Owner | Focus |
|---|---|
| A | Pre-warm route (`app/api/_warm/route.ts`), fixtures fallback when `DEMO_MODE=true`, retry/timeout hardening on external calls, Upstash cost check. |
| B | Prompt tuning — confirm 3 distinct registers actually fire across 10 contexts. Imagery review (does each `imageryHint` land?). Add `quiet_premium` if there's slack. |
| C | Animations: push slide-in, QR rotate-in, redemption check, card mount. Architecture diagram for README. Privacy chip rendering. Demo controls polish. |

Joint: 30-min walkthrough at H21 to catch anything that shifted.

---

## 6. Phase 5 — Ship (H22 → end)

1. C drives video recording. 90 seconds. Use `DEMO_MODE=true` against fixtures so external APIs can't break the take. All four UX pillars named on camera.
2. A runs `vercel --prod`. Verify env vars on prod project.
3. B writes the README "Generative engine" section, paste prompt + schema, document provider toggle.
4. All three: walk §15 "What done looks like" checkbox by checkbox. Anything red, fix or drop.
5. Submit.

---

## 7. Conventions (read once, follow always)

- **Branches:** never push to `main` directly after H2. PR + at least one ack from another teammate, even if rubber-stamped.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `refactor:`. Squash on merge.
- **Schema changes:** any edit to `lib/types/api.ts` after H2 needs a 3-person ack in chat. Otherwise integration breaks silently.
- **Mocks:** every mock value gets a `// MOCK:` comment with the date and what it's faking. Grep before each merge to make sure nothing leaks.
- **Env vars:** never commit real keys. `.env.local` is gitignored; `.env.local.example` documents shape.
- **Standups:** 5 min every ~4 hours. What landed, what's blocked, what you need from whom. Silence kills hackathons.
- **No force pushes to main.** Force pushes to your own feature branch are fine *before* opening the PR; after, rebase and `--force-with-lease` only.
- **Stop the line:** if a teammate is blocked on you, drop your current task and unblock them. Integration > local progress.

---

## 8. Risk register & escape hatches

| Risk | Trigger | Escape hatch |
|---|---|---|
| Anthropic API down / slow | B sees timeouts > 5s in offer generation | Flip `LLM_PROVIDER=openai`, redeploy. Vercel AI SDK swap is config-only. |
| Google Maps quota exhausted | A sees 403 on Static Maps | Set `MAPS_PROVIDER=osm`, restart. Already implemented behind interface. |
| Ticketmaster sparse for Stuttgart | A sees < 3 events in real response | `DEMO_MODE=true` falls back to `fixtures/events.json` written on first successful call. |
| Upstash quota tight | A sees rate limit on Vercel preview | Free tier is 500K cmd/month — extremely unlikely. If hit: reduce SSE heartbeat to 60s. |
| Merge conflict on `lib/types/api.ts` | Two people edited it after H2 | Stop merging. 3-way sync call. Resolve in a single PR; the other two rebase. |
| One branch is far behind at H10 | Owner self-reports or blocks others | Cut scope from §15 checklist. `quiet_premium` register, second city YAML, animations are all droppable. The Mia scenario is not. |
| Demo recording fails on real APIs | Recording day, signal flakes mid-take | `DEMO_MODE=true` + cached fixtures. Demo controls panel can force-trigger any rule. Plan for at least 3 takes. |

---

## 9. Definition of "ready to merge"

A branch is mergeable when:
- [ ] Builds clean (`pnpm build`).
- [ ] No `// MOCK:` comments on exported public functions in your owned surface area (mocks at integration boundaries are still fine; they get swapped in Phase 3).
- [ ] Endpoints return shapes matching `lib/types/api.ts` exactly. Validate with a Zod parse in a smoke test if unsure.
- [ ] No new deps without team ack (we have a tight bundle).
- [ ] One other person has clicked through the branch's preview URL.
- [ ] Conventional commit messages on every commit (squash will use the PR title).
