# Slot C (Frontend / UX) — Hand-off Note

**Author:** Nidhi Lade · UX Lead
**Branch:** `nidhi/frontend` (pushed to origin)
**Repo:** https://github.com/Trimbkjagtap/Triple-Threat---CityWallet
**Status as of this note:** Consumer-side flow end-to-end working against mocks. Merchant dashboard, demo controls panel, and DismissSheet UI still to do. Branch already merged once via PR #5; current branch is 2 commits ahead of `main` with hydration fixes.

---

## 1. What I built (chronological)

10 commits authored by me, plus team integration commits I pulled from `main`.

| Commit | Scope |
|---|---|
| `8686af0` | chore: claim slot C ownership in BUILD_PLAN.md |
| `eb96017` | iOS palette tokens (`--ios-bg/-card/-muted/-accent/-divider`) in `app/globals.css` |
| `7e30559` | `PhoneFrame.tsx` — 390×844 iOS shell with status bar, dynamic island, home indicator |
| `ef64d0a` | `LockScreen.tsx` + `HomescreenBanner.tsx` channels |
| `5437fee` | `PushNotification.tsx` — slide-down, swipe-dismiss, 8s auto-expire |
| `0af237e` | `ContextChips.tsx` + `OfferCard.tsx` (with JSON placeholder for GenUI primitive) |
| `8f0f7f5` | `lib/api-client.ts` — typed wrappers + `MOCK_*` fixtures, `NEXT_PUBLIC_MOCK` flag |
| `ef43369` | `app/(consumer)/page.tsx` — full state machine + `RedeemView` placeholder |
| `b7dfab9` | `RedeemView.tsx` — real QR (qrcode pkg) + countdown + validate polling |
| `9ea8202` | fix: hydration cleanup (`suppressHydrationWarning` + defer `Date.now()`) |

Plus a follow-up fix from teammate after PR #5 was merged: `b4c0730 fix: wire GenUIPrimitive into OfferCard, remove JSON placeholder` — replaced my placeholder with B's real primitive.

---

## 2. Surface area I own

Per [CLAUDE.md](../CLAUDE.md) line 31, slot C owns:

| Path | Status |
|---|---|
| [app/(consumer)/page.tsx](../app/(consumer)/page.tsx) | ✅ done — full state machine |
| [app/(merchant)/](../app/) | ❌ not started |
| [components/consumer/](../components/consumer/) | ✅ 8 files — see §4 |
| [components/merchant/](../components/) | ❌ not started |
| [lib/api-client.ts](../lib/api-client.ts) | ✅ done — 7 endpoint wrappers + 5 mock fixtures |
| Tailwind theme block in [app/globals.css](../app/globals.css) | ✅ done — iOS palette added |
| Demo controls panel | ❌ not started |

**Do not touch (other slots):** `app/api/**`, `lib/cache/**`, `lib/context/**`, `lib/events/**`, `lib/maps/**`, `lib/prompt/**`, `lib/intent/**`, [lib/types/api.ts](../lib/types/api.ts) (frozen contract — needs 3-person ack to change).

---

## 3. What works at http://localhost:3000 right now

The page renders one iPhone frame that runs the **full Mia scenario flow** against mocks:

1. **t=0** — empty lock screen ("9:41" / "Tuesday, April 25")
2. **t=~0s** — first context poll fires; mock returns Stuttgart context with `rain_quiet_warmup` trigger; `generateOffer()` returns `MOCK_OFFER` (Café Müller free oat milk); push notification slides down from the dynamic island
3. **t=+2s** — secondary channel lights up: lock screen widget below the time shows the offer + chip row
4. **Tap push** → OfferCard opens with **B's real `<GenUIPrimitive>`** (warm_emotional register), context chips above headline, "Use offer" CTA, privacy chip ("On device intent: warm drink seeking")
5. **Tap "Use offer"** → RedeemView with real QR (encodes the redeem token's qrPayload), live `MM:SS` countdown, "Awaiting counter scan" pulsing dot, polling `validateRedeemToken` every 3s
6. **t=+6s after redeem** → mock validate flips to `valid: true`, RedeemView animates a green check + "Redeemed at Café Müller"
7. **Reset** button below the phone clears `localStorage` suppression and replays the flow

Below the phone there's a debug strip showing `view: <state>` (idle / notified / viewing / redeeming) — useful for verifying state transitions.

---

## 4. File index

### `components/consumer/`

| File | Purpose | Notes |
|---|---|---|
| [PhoneFrame.tsx](../components/consumer/PhoneFrame.tsx) | iOS device shell | Server component. Props: `children`, `mapSlot`, `time`, `className`. 390×844 with dynamic island, status bar, home indicator. |
| [LockScreen.tsx](../components/consumer/LockScreen.tsx) | iOS lock screen | Server component. Big thin time + date; widget slot lights up when `offer` prop is non-null. |
| [HomescreenBanner.tsx](../components/consumer/HomescreenBanner.tsx) | iOS homescreen | Server component. 4-col emoji app grid + dock. Banner card slides in above the dock when `offer` is non-null. |
| [PushNotification.tsx](../components/consumer/PushNotification.tsx) | Notification overlay | **Client.** Slides down from dynamic island. Tap → `onTap`. Swipe down (>30px) → `onDismiss`. After `autoExpireMs` (default 8000) → `onAutoExpire`. Keyboard: Enter / Escape. |
| [ContextChips.tsx](../components/consumer/ContextChips.tsx) | Pill row | Server component. Renders 2–4 `ContextChip`s. The brief's "≥2 visible context signals" requirement. |
| [OfferCard.tsx](../components/consumer/OfferCard.tsx) | In-app full card | **Client.** Header (merchant name + close), `<ContextChips>`, `<GenUIPrimitive>` from B's registry, CTA button (`bg-ios-accent`), privacy chip. |
| [RedeemView.tsx](../components/consumer/RedeemView.tsx) | QR + countdown | **Client.** Generates QR via `qrcode.toDataURL(token.qrPayload)`. Live countdown. Polls `validateRedeemToken` every 3s. Success state with green check on `valid: true`. |

### `app/(consumer)/`

| File | Purpose |
|---|---|
| [page.tsx](../app/(consumer)/page.tsx) | The consumer home — `"use client"` state machine. View states: `idle / notified / viewing / redeeming`. Polls context every 5s, fires offer on trigger, handles localStorage 24h suppression on dismiss. |

### `lib/`

| File | Purpose |
|---|---|
| [api-client.ts](../lib/api-client.ts) | Typed wrappers for all consumer-facing endpoints. Branches on `process.env.NEXT_PUBLIC_MOCK`. Exports `MOCK_OFFER`, `MOCK_CONTEXT_RESPONSE`, `MOCK_REDEEM_TOKEN`, `MOCK_VALIDATE_RESPONSE`, `MOCK_MERCHANT_STATS`. |

### `app/`

| File | Purpose |
|---|---|
| [layout.tsx](../app/layout.tsx) | Root layout. Title set to "City Wallet". `suppressHydrationWarning` on `<body>` (kills Grammarly extension noise). |
| [globals.css](../app/globals.css) | Tailwind v4 theme. iOS tokens added in `@theme inline` + `:root` + `.dark` blocks. |

---

## 5. Mock layer — how to flip to real

`lib/api-client.ts` reads `process.env.NEXT_PUBLIC_MOCK`. Default = mock on. Set `NEXT_PUBLIC_MOCK=false` in `.env.local` to hit real endpoints.

### What flips

| Function | When MOCK | When real (NEXT_PUBLIC_MOCK=false) |
|---|---|---|
| `getContextState` | Returns `MOCK_CONTEXT_RESPONSE` (Stuttgart 9:41 Sat, rainy 8°C, `rain_quiet_warmup` trigger fires immediately) | POST `/api/context/state` (slot A — already on main) |
| `generateOffer` | Returns `MOCK_OFFER` (Café Müller free oat milk, warm_emotional register) | POST `/api/offer/generate` (slot B — already on main, streams `Offer` via Vercel AI SDK) |
| `postOfferAction` | Returns `{ ok: true }` | POST `/api/offer/action` |
| `postRedeemToken` | Returns `MOCK_REDEEM_TOKEN` | POST `/api/redeem/token` |
| `validateRedeemToken` | Returns `{ valid: false, reason: "Awaiting counter scan" }` for the first 6s per token, then `MOCK_VALIDATE_RESPONSE` (`valid: true`) | POST `/api/redeem/validate` |
| `getMerchantStats` | Returns `MOCK_MERCHANT_STATS` | GET `/api/merchant/stats?merchantId=...` |
| `postMerchantPulse` | Returns `{ ok: true }` | POST `/api/merchant/pulse` |

### Note on `generateOffer`

The frozen `OfferGenerateRequest` type requires a `merchantRule` field. The consumer doesn't actually know merchant rules — the server should fetch from `trigger.merchantId`. I pass a `STUB_RULE` constant in `app/(consumer)/page.tsx` with a `// TODO H14` comment. When flipping mocks off, this may need to be reviewed with B.

### Note on streaming

`generateOffer` currently returns `Promise<Offer>`. B's real endpoint streams via `streamObject`. To get progressive rendering of headline → subline → chips, the wrapper should be refactored to return a stream and OfferCard updated to use `useObject` from `ai/react`. Mock returns immediately so this hasn't been needed yet.

---

## 6. Setup for a fresh teammate

```bash
# 1. Clone if you haven't
git clone https://github.com/Trimbkjagtap/Triple-Threat---CityWallet.git
cd Triple-Threat---CityWallet

# 2. Check out my branch (or main if you'll branch off)
git fetch origin
git checkout nidhi/frontend

# 3. Install
pnpm install      # node 20+, pnpm 10+

# 4. Env (mocks-only, no API keys needed for slot C dev)
cp .env.local.example .env.local
# Confirm .env.local has NEXT_PUBLIC_MOCK=true

# 5. Run
pnpm dev
# → http://localhost:3000

# Optional sanity checks
pnpm lint
pnpm build
```

If `pnpm dev` says "Another next dev server is already running" — find the PID it tells you and kill it: `taskkill /PID <PID> /F`.

---

## 7. Git workflow

- **Never push to `main`.** Open a PR from `nidhi/frontend` (or your own branch) to `main`.
- My branch `nidhi/frontend` was merged via PR #5 already. Subsequent commits stay on the branch and get merged at the next integration window.
- Daily flow:

```bash
git status
git diff
git add <specific files>     # avoid `git add .`
git commit -m "<scope>: <what>"
git push                     # goes to nidhi/frontend (upstream is set)
```

- Stay synced with main:

```bash
git stash push -u -m "WIP" # if dirty
git checkout main && git pull origin main
git checkout nidhi/frontend && git rebase main
git push --force-with-lease
git stash pop              # if you stashed
```

---

## 8. What's still to do (priority order)

1. **DismissSheet UI (small — finishes H7–H8 cleanly).** The data side (`postOfferAction({ action: 'dismissed' })` + `localStorage` suppression) is already wired in `app/(consumer)/page.tsx`. Need to add a confirmation sheet via shadcn `Sheet` + a `sonner` toast ("You won't see this for 24 hours"). Triggered by swipe-down on push or X-tap on offer card.

2. **Flip mocks → real (post-H10/H14 integration test).** Set `NEXT_PUBLIC_MOCK=false` in `.env.local`, exercise the consumer flow against slot A's real backend + slot B's streaming offer. Catch contract bugs while mocks are still around as fallback. Will likely surface:
   - `merchantRule` requirement in `OfferGenerateRequest` (see §5 note)
   - Streaming `Offer` shape — may want `useObject` for progressive rendering
   - Real Stuttgart weather / Ticketmaster events from slot A — verify chips populate

3. **Merchant dashboard (H8–H9).** New routes:
   - `app/(merchant)/page.tsx` — `<StatsGrid>`, `<LiveFeed>`, `<PulseButtons>`, `<TransactionsChart>`
   - `app/(merchant)/rules/page.tsx` — rule editor form (max discount, valid mins, goal, conditions)
   - Components in `components/merchant/`
   - Polls `getMerchantStats` every 5s; SSE on `/api/context/stream` for LiveFeed (deferred from api-client.ts — needs adding)
   - Pulse buttons POST via `postMerchantPulse`

4. **Demo controls panel (H9–H10).** Dev-only, gated by `process.env.NODE_ENV !== 'production' && URL searchParams.has('demo')`. Controls:
   - Force trigger (e.g., `rain_quiet_warmup`)
   - Behavioral signal override (stationary / strolling / commuting / unknown)
   - Inventory pulse toggles
   - Channel preview (lock / homescreen / push / in-app)
   - Geofence override
   - Force quiet (set merchant demand ratio)
   - **Critical for video reshoots** — invest time here.

5. **Polish for the demo:**
   - Add a real Stuttgart map render in `PhoneFrame`'s `mapSlot` (slot A has Google Static Maps URLs available)
   - Make the "view: idle" debug strip dev-gated (hide in production builds)
   - Consider unifying the `appIcon` for PushNotification (currently 🏙️ emoji — could use a real logo)

---

## 9. Known issues / quirks

- **LF/CRLF warnings** on every Windows commit — harmless, just git normalizing line endings.
- **Hydration warning** was caused by my `useState(() => Date.now())` in RedeemView; fixed in `9ea8202` by initializing to `0` and setting on mount. Also added `suppressHydrationWarning` to `<body>` to silence Grammarly/other extensions injecting attributes.
- **Mock validate per-token timer** in `api-client.ts` uses module-level `Map<token, timestamp>`. Persists across navigation but resets on full page reload. Fine for the demo flow.
- **`STUB_RULE`** in `app/(consumer)/page.tsx` — placeholder `MerchantRule` passed to `generateOffer` because the consumer doesn't actually know merchant rules. Will need a real source when `NEXT_PUBLIC_MOCK=false`. Tagged with `// TODO H14`.
- **Branch name**: I went with `nidhi/frontend` instead of the team-convention `feat/frontend`. If you prefer the team name, rename via:
  ```bash
  git branch -m nidhi/frontend feat/frontend
  git push -u origin feat/frontend
  git push origin --delete nidhi/frontend
  ```

---

## 10. Reference docs

- [docs/role-C-frontend.md](./role-C-frontend.md) — full slot C spec, hour-by-hour
- [PLAN.md](../PLAN.md) §6 — Mia scenario (the demo shot list)
- [PLAN.md](../PLAN.md) §7C — frontend spec
- [BUILD_PLAN.md](../BUILD_PLAN.md) §3C — schedule + integration phases
- [CLAUDE.md](../CLAUDE.md) — stack rules, branch ownership
- [lib/types/api.ts](../lib/types/api.ts) — frozen API contract — read often
