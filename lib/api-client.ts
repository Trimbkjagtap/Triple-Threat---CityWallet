import type {
  ContextResponse,
  ContextStateRequest,
  MerchantPulsePost,
  MerchantRule,
  MerchantStats,
  Offer,
  OfferAction,
  OfferGenerateRequest,
  OkResponse,
  RedeemTokenResponse,
  ValidateResponse,
} from "@/lib/types/api";

const MOCK = process.env.NEXT_PUBLIC_MOCK !== "false";

// ─── Mock fixtures ──────────────────────────────────────────────────────────

// MOCK: replace post-H14 (B's streaming offer endpoint)
export const MOCK_OFFER: Offer = {
  id: "demo_offer_1",
  merchantId: "m_cafe_mueller",
  merchantName: "Café Müller",
  headline: "Free oat milk on cappuccino",
  subline: "Quiet hour just started — warm one up?",
  discount: { type: "free_addon", description: "Free oat milk upgrade" },
  expiresAt: "2026-04-25T10:11:00.000Z",
  contextChips: [
    { icon: "🌧", label: "Rainy", signalKey: "weather" },
    { icon: "📍", label: "120m away", signalKey: "proximity" },
    { icon: "🕒", label: "Quiet hour", signalKey: "demand" },
  ],
  ui: {
    register: "warm_emotional",
    primaryColor: "#8B4513",
    imageryHint: "steaming_cup",
  },
  cta: "Use offer",
  rationale: "Rain + low demand at café within walking distance",
};

// MOCK: replace post-H10 (A's /api/context/state)
export const MOCK_CONTEXT_RESPONSE: ContextResponse = {
  context: {
    userId: "user_demo",
    weather: { tempC: 8, condition: "rain", summary: "Light rain" },
    time: {
      iso: "2026-04-25T09:41:00.000Z",
      hour: 9,
      dayOfWeek: "sat",
      period: "morning",
    },
    location: {
      cityKey: "stuttgart",
      lat: 48.7762,
      lng: 9.1822,
      inZones: ["altstadt"],
      neighborhoodId: "altstadt",
    },
    demand: [
      {
        merchantId: "m_cafe_mueller",
        transactionsPerHour: 3,
        weeklyAvg: 12,
        ratio: 0.25,
      },
    ],
    merchantPulse: [],
    events: [],
    behavioral: "strolling",
    intentHint: "warm_drink_seeking",
  },
  trigger: {
    ruleId: "rain_quiet_warmup",
    merchantId: "m_cafe_mueller",
    priority: 10,
    firedSignals: MOCK_OFFER.contextChips,
  },
};

// MOCK: replace post-H10 (A's /api/redeem/token)
export const MOCK_REDEEM_TOKEN: RedeemTokenResponse = {
  token: "demo_token_xyz123",
  qrPayload: "citywallet://redeem/demo_token_xyz123",
  expiresAt: "2026-04-25T10:11:00.000Z",
};

// MOCK: replace post-H10 (A's /api/redeem/validate)
export const MOCK_VALIDATE_RESPONSE: ValidateResponse = {
  valid: true,
  offer: MOCK_OFFER,
};

// MOCK: replace post-H10 (A's /api/merchant/stats)
export const MOCK_MERCHANT_STATS: MerchantStats = {
  generated: 47,
  accepted: 31,
  dismissed: 9,
  expired: 4,
  redeemed: 22,
  acceptanceRate: 0.66,
  recentOffers: [
    {
      offerId: "demo_offer_1",
      createdAt: "2026-04-25T09:41:00.000Z",
      headline: "Free oat milk on cappuccino",
      status: "redeemed",
    },
    {
      offerId: "offer_002",
      createdAt: "2026-04-25T09:12:00.000Z",
      headline: "Buy one croissant, get a flat white",
      status: "accepted",
    },
    {
      offerId: "offer_003",
      createdAt: "2026-04-25T08:48:00.000Z",
      headline: "20% off morning pastries",
      status: "expired",
    },
  ],
};

// ─── HTTP helpers ───────────────────────────────────────────────────────────

async function postJSON<TBody, TResp>(
  path: string,
  body: TBody,
): Promise<TResp> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<TResp>;
}

async function getJSON<TResp>(path: string): Promise<TResp> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<TResp>;
}

// ─── Endpoint wrappers ──────────────────────────────────────────────────────

export async function getContextState(
  req: ContextStateRequest,
): Promise<ContextResponse> {
  if (MOCK) return MOCK_CONTEXT_RESPONSE;
  return postJSON("/api/context/state", req);
}

export async function generateOffer(
  req: OfferGenerateRequest,
): Promise<Offer> {
  if (MOCK) return MOCK_OFFER;
  // /api/offer/generate streams the JSON object as it's generated. Read the
  // whole body as text then parse — gives us the final assembled offer.
  // Progressive rendering via useObject is a polish item; this is correct
  // for non-streaming consumers.
  const res = await fetch("/api/offer/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`/api/offer/generate failed: ${res.status}`);
  }
  const text = await res.text();
  return JSON.parse(text) as Offer;
}

export async function postOfferAction(
  action: OfferAction,
): Promise<OkResponse> {
  if (MOCK) return { ok: true };
  return postJSON("/api/offer/action", action);
}

export async function postRedeemToken(
  offerId: string,
): Promise<RedeemTokenResponse> {
  if (MOCK) return MOCK_REDEEM_TOKEN;
  return postJSON("/api/redeem/token", { offerId });
}

// Per-token first-seen timestamp so the mock validates after a short delay,
// giving the demo time to show the QR + countdown before flipping to success.
const MOCK_VALIDATE_DELAY_MS = 6000;
const mockValidateFirstSeen = new Map<string, number>();

export async function validateRedeemToken(
  token: string,
): Promise<ValidateResponse> {
  if (MOCK) {
    const seenAt = mockValidateFirstSeen.get(token) ?? Date.now();
    if (!mockValidateFirstSeen.has(token)) {
      mockValidateFirstSeen.set(token, seenAt);
    }
    if (Date.now() - seenAt < MOCK_VALIDATE_DELAY_MS) {
      return { valid: false, reason: "Awaiting counter scan" };
    }
    return MOCK_VALIDATE_RESPONSE;
  }
  return postJSON("/api/redeem/validate", { token });
}

export async function getMerchantStats(
  merchantId: string,
): Promise<MerchantStats> {
  if (MOCK) return MOCK_MERCHANT_STATS;
  return getJSON(
    `/api/merchant/stats?merchantId=${encodeURIComponent(merchantId)}`,
  );
}

export async function postMerchantPulse(
  req: MerchantPulsePost,
): Promise<OkResponse> {
  if (MOCK) return { ok: true };
  return postJSON("/api/merchant/pulse", req);
}

export async function getMerchantRules(
  merchantId: string,
): Promise<MerchantRule[]> {
  if (MOCK) return [];
  const resp = await getJSON<{
    ok: true;
    merchantId: string;
    rules: MerchantRule[];
  }>(`/api/merchant/rules?merchantId=${encodeURIComponent(merchantId)}`);
  return resp.rules;
}

export async function postMerchantRule(
  rule: MerchantRule,
): Promise<{ ok: true; rule: MerchantRule }> {
  if (MOCK) return { ok: true, rule };
  return postJSON("/api/merchant/rules", rule);
}
