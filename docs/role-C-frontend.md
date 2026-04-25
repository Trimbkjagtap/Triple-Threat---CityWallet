# Slot C — Frontend / UX Lead

> Branch: `feat/frontend`
> You own everything the judges see. The phone, the push, the QR, the dashboard.

## What you own

| Surface | What lives there |
|---|---|
| `app/(consumer)/**` | Phone home, offer detail, redeem |
| `app/(merchant)/**` | Dashboard + rule editor |
| `components/consumer/**` | PhoneFrame, LockScreen, HomescreenBanner, PushNotification, OfferCard, ContextChips, RedeemView, DismissSheet |
| `components/merchant/**` | RuleEditor, LiveFeed, StatsGrid, PulseButtons |
| `lib/api-client.ts` | Typed wrappers for every endpoint, with `MOCK=true` flag |
| Tailwind theme + shadcn config | Whatever `tailwind.config.ts` and `components.json` say |
| Demo controls panel | Dev-only, gated |

You don't touch: anything in `app/api/**`, `lib/cache/**`, `lib/context/**`, `lib/events/**`, `lib/maps/**`, `lib/prompt/**`, `lib/intent/**`, `lib/types/api.ts` (frozen after H2). You **read** `lib/intent/{classifier,movement}.ts` from B.

## Read first (15 min)

- `PLAN.md` §6 (the demo scenario — this is your shot list), §7C (your spec), §8 (the contracts you consume), §10 (privacy chip).
- `BUILD_PLAN.md` §3C (your hour-by-hour).

## Setup

```bash
git pull origin main
git checkout feat/frontend
pnpm install
cp .env.local.example .env.local
```

Keys you need in `.env.local`: **none for local dev with mocks.** When integrating post-H10 you'll pull the same env file the others use.

For the merchant dashboard's live feed (SSE), you'll need Redis credentials at integration time, but until then mock the event source.

Smoke test you're ready: `pnpm dev` boots, you can navigate to `/` and `/merchant` (both will be empty until you build them).

## Hour by hour (H2 → H10)

### H2–H3 · Theme + phone shell

**Tailwind theme** — pick a tight palette in `tailwind.config.ts`:

- `ios-bg` (off-white / dark), `ios-card`, `ios-muted`, `ios-accent` (a Stuttgart-friendly red?), `ios-divider`.
- Font stack: `SF Pro` if available, else `system-ui` for the iOS feel; one display serif for `warm_emotional` and `quiet_premium`.

**`components/consumer/PhoneFrame.tsx`** — fixed-width container (~390px), iOS chrome:

- Top: status bar (time, signal, battery — fake static values).
- Dynamic island (the rounded black pill — important for `PushNotification` slide-down anchor).
- Bottom: home indicator bar.
- Background slot for a Stuttgart map render. Use one of A's static map URLs once integrated; for now, an SVG of the city outline or a placeholder.

Keep it `relative` and `overflow-hidden` so push and lock-screen overlays stack cleanly inside.

### H3–H4 · Lock screen + homescreen banner

**`components/consumer/LockScreen.tsx`** — mock iOS lock screen. Time + date in the iOS lock typography (huge thin numerals). A widget slot below: when `offer` prop is present, render a compact card-style widget with headline + chip row. When absent, show a neutral lock screen.

**`components/consumer/HomescreenBanner.tsx`** — mock iOS homescreen with a 4-column app grid (use emoji or simple SVG icons). Reserve one row near the dock for a banner-style offer slot. When `offer` is present, slide a banner card in from the bottom.

These two are *channels* in the brief — you'll demo them by toggling between lock/homescreen/in-app via the demo controls.

### H4–H5 · Push notification

**`components/consumer/PushNotification.tsx`** — slide-down animation off the dynamic island. Style:

- Rounded rect, 90% width, soft shadow, blurred background.
- App icon + name (`City Wallet`) on the left. Headline + subline. Time stamp.
- Tap → fires `onTap()` callback. Swipe down → dismiss → fires `onDismiss()`.
- Auto-dismiss after 8s if no interaction (call `onAutoExpire()`).

Animation: framer-motion or pure CSS. Avoid bouncy easing — iOS push slides are crisp and quick.

### H5–H6 · Context chips + offer card structure

**`components/consumer/ContextChips.tsx`**

```tsx
export function ContextChips({ chips }: { chips: ContextChip[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map(c => (
        <span key={c.label} className="text-xs bg-ios-muted px-2 py-1 rounded-full">
          {c.icon} {c.label}
        </span>
      ))}
    </div>
  );
}
```

Renders 2–4 chips, each `icon + label`. Always above the headline on the offer card. **This is how we satisfy the brief's "≥2 visible context signals" requirement** — do not let it slip below the fold.

**`components/consumer/OfferCard.tsx`** — the in-app full card. Structure:

```tsx
<div>
  <ContextChips chips={offer.contextChips} />
  <GenUIPrimitive register={offer.ui.register} offer={offer} />
  <Cta onPress={onAccept}>{offer.cta}</Cta>
  <PrivacyChip />            {/* "On device intent: warm drink seeking" */}
</div>
```

`GenUIPrimitive` resolves from B's `components/gen-ui/registry.ts`. Until B's branch is in, render a placeholder primitive that just dumps the offer JSON in monospace. Do **not** spend time styling it — B's primitives replace it.

### H6–H7 · Mock API client + consumer page glue

**`lib/api-client.ts`** — typed wrappers for every endpoint A and B will produce. Add a `MOCK` constant at the top:

```ts
const MOCK = process.env.NEXT_PUBLIC_MOCK !== 'false';   // default true until integration
```

For each endpoint, branch on `MOCK`:

```ts
export async function getContextState(args: GetContextArgs): Promise<ContextResponse> {
  if (MOCK) return MOCK_CONTEXT_RESPONSE;             // hardcoded fixture
  return fetch('/api/context/state', { method: 'POST', body: JSON.stringify(args) }).then(r => r.json());
}
```

Define `MOCK_CONTEXT_RESPONSE`, `MOCK_OFFER_STREAM` (just yield the full offer immediately), `MOCK_REDEEM_TOKEN`, `MOCK_VALIDATE_RESPONSE`, `MOCK_MERCHANT_STATS` as literals matching `lib/types/api.ts` exactly. Run them through the Zod schemas if you want a build-time guarantee.

**`app/(consumer)/page.tsx`** — the home view.

```
on mount:
  - get geolocation (or use mock { 48.7762, 9.1822 })
  - poll getContextState every 5s
when contextResponse.trigger is non-null and we don't already have an offer:
  - call generateOffer(contextState, trigger, merchantRule)
  - mount <PushNotification offer={offer} onTap=>openCard onDismiss=>suppressFor24h />
  - after 2s without tap, also populate <LockScreen> + <HomescreenBanner> mocks
on push tap:
  - mount <OfferCard offer={offer} onAccept=>mintToken onDismiss=>suppress />
on accept:
  - postRedeemToken(offerId)
  - swap to <RedeemView token>
```

State all in `useState` + `URL params`; no Redux.

### H7–H8 · Redeem + dismiss

**`components/consumer/RedeemView.tsx`** — QR + countdown.

- Generate QR via `qrcode` npm package, render to `<canvas>` or inline SVG.
- Big countdown ("29:47") below the QR.
- Polls `validateRedeemToken(token)` every 3s. On `valid: true`, animate a green check + "Redeemed at Café Müller" success state.
- "Show at counter" copy.

**`components/consumer/DismissSheet.tsx`** — bottom sheet (use shadcn `Sheet`). Triggered by swipe-down on push or X-tap on offer card. Toast: *"You won't see this for 24 hours."* Posts a `dismissed` action to `/api/offer/action`. Writes a `suppress:{merchantId}` key to `localStorage` with a 24h timestamp.

In `app/(consumer)/page.tsx`, before mounting a push, check `localStorage` for active suppression; skip if found. **This is the brief's fourth UX pillar.**

### H8–H9 · Merchant dashboard

**`app/(merchant)/page.tsx`** — dashboard layout. Three regions:

1. **`<StatsGrid>`** — top row of big numbers: `generated / accepted / dismissed / redeemed / acceptanceRate`. Polls `getMerchantStats` every 5s.
2. **`<LiveFeed>`** — vertical feed of recent offers. Each row: timestamp, headline, status pill (pending/accepted/dismissed/expired/redeemed). Subscribes via `EventSource('/api/context/stream')` (or polls if SSE is post-integration).
3. **`<PulseButtons>`** — row of one-tap buttons: "Fresh batch", "Just baked", "Limited stock", "End of shift". Each POSTs to `postMerchantPulse({ merchantId, kind, label, ttlMinutes: 30 })`. Show a 30-min countdown on the active pulse so the merchant knows when it ends.
4. (Below) `<TransactionsChart>` — a simple sparkline of `transactionsPerHour` over the last few hours, to show the "quiet hour" rule firing visibly. shadcn's chart primitives are fine.

**`app/(merchant)/rules/page.tsx`** — rule editor. Form fields:

- Max discount % (number input, capped at 50)
- Valid minutes (number, default 30)
- Goal (text)
- Conditions (multi-select):
  - Weather: `rain | snow | drizzle | clear | cloud | fog`
  - Temperature below: number
  - Demand below ratio: number (0–1)
  - Day of week: checkbox group
  - Inventory pulse: checkbox `fresh_batch | just_baked | limited_stock | end_of_shift`
  - Inside zone: dropdown of neighborhoods from YAML

On save, POST to `/api/merchant/rules` (you'll need to coordinate with A — this endpoint isn't in §7A, so flag it at H6 standup).

Even a static mockup is acceptable per the brief. Make it look real, but if rule persistence slips, ship the mockup.

### H9–H10 · Demo controls panel + PR

**Demo controls panel** — gated dev component. Mount in `app/(consumer)/page.tsx` with `process.env.NODE_ENV !== 'production' && new URL(location.href).searchParams.has('demo')`.

Controls:

- **Force trigger** — buttons: "Trigger rain_quiet_warmup", "Trigger event_pre_show", etc. Calls `getContextState({ ..., demoForceRule: 'rain_quiet_warmup' })` (you'll need A to honor this query param — coordinate at H6).
- **Behavioral signal override** — radio: stationary / strolling / commuting / unknown.
- **Inventory pulse toggles** — on/off per pulse kind.
- **Channel preview** — radio: lock / homescreen / push / in-app card. Forces the offer onto the chosen surface for video reshoots.
- **Geofence override** — checkbox: "Inside Altstadt polygon" → forces `location.inZones=['altstadt']`.
- **Force quiet** — slider: set the merchant demand ratio for `m_cafe_mueller`.

This panel is your single most important hackathon insurance. Reshoots will be fast or painful depending on it.

**PR** — open it. Self-review allowed. Request quick eyeball from A (about the demo control query params) and B (about the registry slot in OfferCard).

## What you consume

| Endpoint | From slot | Shape |
|---|---|---|
| `POST /api/context/state` | A | `ContextResponse` |
| `POST /api/offer/generate` | B | streaming `Offer` |
| `POST /api/offer/action` | A | `{ ok: true }` |
| `POST /api/redeem/token` | A | `RedeemTokenResponse` |
| `POST /api/redeem/validate` | A | `ValidateResponse` |
| `GET /api/merchant/stats` | A | `MerchantStats` |
| `POST /api/merchant/pulse` | A | `{ ok: true }` |
| `GET /api/context/stream` | A (SSE) | event stream of context updates |
| `lib/intent/classifier.ts` | B | function returning intent label |
| `lib/intent/movement.ts` | B | function returning movement label |
| `components/gen-ui/registry.ts` | B | React component map |

## What you mock

Everything in `lib/api-client.ts` is mock-flagged via `NEXT_PUBLIC_MOCK`. Mark every fixture with `// MOCK: replace post-H10/H14`.

## Integration days

### H10–H12 (after `feat/context` merges)

- Rebase `feat/frontend` on main.
- In `lib/api-client.ts`, swap `MOCK` → `false` for context, redemption, merchant stats, merchant pulse calls. Keep `MOCK=true` for offer generation (B not merged yet).
- Sit with A for 10 min: confirm context chips populate from real Stuttgart weather + Ticketmaster events. Notice layout bugs that mocks hid (long event names, missing imagery, etc.).
- Wire the `/api/context/stream` SSE in `<LiveFeed>` for the merchant dashboard.

### H14–H16 (after `feat/genui` merges)

- Rebase again.
- Swap mock offer for real `streamObject` consumption. Use the AI SDK's `useObject` hook on the client *or* read the stream directly with `ReadableStream`. Render `partialObject` progressively in `OfferCard`: headline first, then subline, then chips, then primitive register choice.
- Replace placeholder primitive in `OfferCard` with `<GenUIPrimitive register={offer.ui.register} offer={offer} />` from B's registry.
- Sit with B for 10 min: confirm the 3 registers visibly differ when forced via demo controls.

### H16–H18 (your own merge)

- Open PR. All three of you review.
- After merge, the team runs the Mia scenario (PLAN.md §6) end-to-end on the Vercel preview. Note glitches in a shared list.
- Triage: critical (blocks demo) vs polish vs drop.

## Definition of done (your slot)

- [ ] All 4 channels visible: push notification, lock-screen widget, homescreen banner, in-app card.
- [ ] Context chips render above headline with 2–4 chips on every offer card.
- [ ] All 3 GenUI registers (B's) render distinctly when forced via demo controls.
- [ ] Redeem flow: tap accept → QR mounts → countdown ticks → polled validate flips to green check.
- [ ] Dismiss flow: swipe → toast → 24h `localStorage` suppression respected on next mount.
- [ ] Merchant dashboard: stats poll, live feed (SSE or poll), pulse buttons work.
- [ ] Rule editor renders all condition types from the YAML schema. Save can be a stub if needed.
- [ ] Demo controls panel: force-trigger, behavioral override, channel preview, geofence override, force-quiet — all working.
- [ ] Privacy chip ("On device intent: warm drink seeking") visible on the offer card.
- [ ] Phone frame looks like an iOS device, not a browser tab. Critical for the video.
- [ ] `pnpm build` clean, no TS errors.
- [ ] PR merged, Vercel preview plays the full Mia scenario without dev intervention.
