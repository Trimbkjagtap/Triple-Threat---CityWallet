# City Wallet — Team Onboarding

> Read this first. Then go to your role doc.

## What we're building

**City Wallet is a Living Wallet.** Offers don't exist until the moment they're needed. A user walking through Stuttgart on a cold Tuesday afternoon sees one widget, generated for this minute, this person, this café two blocks away — because the rain just started, the café is unusually quiet, and they like warm drinks. The merchant only sets a goal ("fill quiet hours with up to 20% off"). The AI does the rest.

It's a real-time context layer for local commerce, not a coupon database. We pitch it as the AI layer between Sparkassen's customer relationships, Payone's terminals, and S-Markt's merchant portals — something Amazon cannot replicate.

Hackathon. 3 people. ~24 hours. Web stack (Next.js + TypeScript + Tailwind + shadcn). One repo, one Vercel deploy.

## The 3 slots

| Slot | Branch | Domain | Read this |
|------|--------|--------|-----------|
| **A** | `feat/context` | Backend, APIs, Redis, weather/events/maps, Payone, redemption, merchant stats | [`docs/role-A-backend.md`](./role-A-backend.md) |
| **B** | `feat/genui` | LLM prompt, structured output, intent classifier, GenUI primitives, imagery | [`docs/role-B-genui.md`](./role-B-genui.md) |
| **C** | `feat/frontend` | Phone frame, consumer UI, merchant dashboard, demo controls, video polish | [`docs/role-C-frontend.md`](./role-C-frontend.md) |

## Files to read in order

1. **`PLAN.md`** — the full strategic plan. Skim §1–3, then read §7A (A) / §7B (B) / §7C (C) for your slot, plus §8 (API contracts) for everyone.
2. **`BUILD_PLAN.md`** — the execution schedule. Skim phases 1–5.
3. **Your role doc** — the actual checklist you work from.

`PLAN.md` is the *what* and *why*. `BUILD_PLAN.md` is the *who* and *when*. Your role doc is the *how*.

## First steps once you've been assigned a slot

```bash
git pull origin main                         # scaffolding is already on main
git checkout feat/context                    # or feat/genui or feat/frontend
pnpm install
cp .env.local.example .env.local             # then fill in the keys YOUR slot needs (see your role doc)
pnpm dev                                     # http://localhost:3000
```

If `main` doesn't have the scaffold yet, ping Vivek — he's pushing it before kickoff.

## Hard contracts (do not break)

- **`lib/types/api.ts` is the contract.** Frozen after H2. Schema changes require a 3-person ack in chat.
- **Mocks must match `lib/types/api.ts` exactly.** If you fake a `ContextState` or an `Offer`, validate it against the Zod schema before merging.
- **Never invent context signals.** Everything the user sees flows through `lib/context/aggregator.ts`. If you need a new signal, add it to the aggregator first.
- **Never hardcode merchants, rules, or city params.** They live in `config/cities/*.yaml`.
- **Never edit another slot's surface area without a heads-up in chat.**

## Daily rhythm

- Standup every ~4 hours. 5 min, async-friendly. What landed, what's blocked, what you need.
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`. Squash on merge.
- One PR per branch into `main`. At least one ack from another teammate, even if rubber-stamped.
- No force pushes to `main`. Force-with-lease on your own feature branch is fine before you open the PR.
- If a teammate is blocked on you, drop your task and unblock them. Integration > local progress.

## Integration timeline

| When | Event | What changes |
|------|-------|---------------|
| H0–H2 | Vivek scaffolds and pushes `main` | Three branches exist; `lib/types/api.ts` is locked |
| H2–H10 | Parallel build against mocks | Each slot works in isolation |
| H10–H12 | **Merge `feat/context`** | A's PR lands. B + C rebase. B swaps mock context for real fetch. C swaps mock client for real fetch. |
| H12–H14 | Stabilize | First end-to-end smoke test on Vercel preview |
| H14–H16 | **Merge `feat/genui`** | B's PR lands. C rebases, swaps mock offer for real stream. |
| H16–H18 | **Merge `feat/frontend`** | C's PR lands. Full Mia scenario plays end-to-end. |
| H18–H22 | Polish | Animations, fixtures, prompt tuning |
| H22–end | Ship | 90-second video, README, `vercel --prod` |

## Risk escape hatches (if something breaks)

| Problem | Fix |
|---------|-----|
| Anthropic timing out | `LLM_PROVIDER=openai` in `.env.local`, redeploy. Same Zod schema, no code change. |
| Google Maps quota hit | `MAPS_PROVIDER=osm`. Already implemented. |
| Ticketmaster sparse | `DEMO_MODE=true` falls back to `fixtures/events.json` |
| Schema conflict on `lib/types/api.ts` | Stop merging. 3-way call. Fix in one PR; others rebase. |
| Branch is far behind at H10 | Cut scope: `quiet_premium` register, second city, animations all droppable. Mia scenario is not. |

## When you're stuck

- Check `PLAN.md` §7 for your domain spec.
- Check `BUILD_PLAN.md` §8 risk register.
- Drop in chat. Don't burn 30 min spinning.

---

**Pick your slot doc and start. The hackathon clock is real.**
