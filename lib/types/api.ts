/**
 * Cross-slot API contract. FROZEN after Phase 1.
 * Schema changes require a 3-person ack in the team channel.
 *
 * Authoritative source for: ContextState, Offer, redemption, merchant stats.
 * If you find yourself wanting to add a field, post in chat first.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type BehavioralSignal = 'stationary' | 'strolling' | 'commuting' | 'unknown';

export type IntentHint =
  | 'warm_drink_seeking'
  | 'quick_lunch'
  | 'window_shopping'
  | 'commuting'
  | 'unknown';

export type WeatherCondition = 'clear' | 'cloud' | 'rain' | 'snow' | 'drizzle' | 'fog';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type TimePeriod = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export type SignalKey = 'weather' | 'proximity' | 'time' | 'demand' | 'event' | 'pulse';

export type PulseKind =
  | 'fresh_batch'
  | 'just_baked'
  | 'limited_stock'
  | 'end_of_shift'
  | 'custom';

export type Register = 'warm_emotional' | 'factual_urgent' | 'playful_energetic' | 'quiet_premium';

export type ImageryHint =
  | 'steaming_cup'
  | 'sunny_terrace'
  | 'bakery_shelf'
  | 'evening_pour'
  | 'bookshop_corner'
  | 'rainy_window'
  | 'morning_pastry'
  | 'bench_break';

export type DiscountType = 'percent' | 'fixed' | 'bogo' | 'free_addon';

export type OfferStatus = 'pending' | 'accepted' | 'dismissed' | 'expired' | 'redeemed';

export type OfferActionKind = 'accepted' | 'dismissed' | 'expired' | 'redeemed';

// ─── Context ────────────────────────────────────────────────────────────────

export type ContextChip = {
  icon: string;
  label: string;
  signalKey: SignalKey;
};

export type MerchantPulse = {
  merchantId: string;
  kind: PulseKind;
  label: string;        // human readable, used in copy
  expiresAt: string;    // ISO
};

export type DemandSnapshot = {
  merchantId: string;
  transactionsPerHour: number;
  weeklyAvg: number;
  ratio: number;        // transactionsPerHour / weeklyAvg
};

export type EventInfo = {
  id: string;
  name: string;
  distanceMeters: number;
  startsInMinutes: number;
};

export type ContextState = {
  userId: string;
  weather: {
    tempC: number;
    condition: WeatherCondition;
    summary: string;
  };
  time: {
    iso: string;
    hour: number;
    dayOfWeek: DayOfWeek;
    period: TimePeriod;
  };
  location: {
    cityKey: string;
    lat: number;
    lng: number;
    inZones: string[];          // populated by geofence point-in-polygon eval
    neighborhoodId?: string;
  };
  demand: DemandSnapshot[];
  merchantPulse: MerchantPulse[];
  events: EventInfo[];
  behavioral: BehavioralSignal;
  intentHint: IntentHint;
};

export type Trigger = {
  ruleId: string;
  merchantId: string;
  priority: number;
  firedSignals: ContextChip[];
};

export type ContextResponse = {
  context: ContextState;
  trigger: Trigger | null;
};

export type ContextStateRequest = {
  userId: string;
  lat: number;
  lng: number;
  cityKey: string;
  intentHint: IntentHint;
  behavioral: BehavioralSignal;
  // Demo affordances — non-prod overrides honored when DEMO_MODE=true.
  demoForceRule?: string;
  demoQuiet?: string;             // merchantId to force into quiet-demand state
};

// ─── Offer ──────────────────────────────────────────────────────────────────

export type Offer = {
  id: string;
  merchantId: string;
  merchantName: string;
  headline: string;               // ≤ 8 words
  subline: string;                // ≤ 14 words
  discount: {
    type: DiscountType;
    value?: number;
    description?: string;
  };
  expiresAt: string;              // ISO
  contextChips: ContextChip[];    // 2–4 chips, always rendered above headline
  ui: {
    register: Register;
    primaryColor: string;         // hex
    accent?: string;
    imageryHint: ImageryHint;
  };
  cta: string;                    // e.g. "Use offer"
  rationale: string;              // human readable, debug only
};

export type OfferGenerateRequest = {
  contextState: ContextState;
  trigger: Trigger;
  merchantRule: MerchantRule;
};

// ─── Redemption ─────────────────────────────────────────────────────────────

export type RedeemTokenRequest = { offerId: string };

export type RedeemTokenResponse = {
  token: string;
  qrPayload: string;
  expiresAt: string;
};

export type ValidateRequest = { token: string };

export type ValidateResponse = {
  valid: boolean;
  offer?: Offer;
  reason?: string;
};

// ─── Offer actions (analytics) ──────────────────────────────────────────────

export type OfferAction = {
  offerId: string;
  action: OfferActionKind;
  ts: string;
};

// ─── Merchant ───────────────────────────────────────────────────────────────

export type MerchantPulsePost = {
  merchantId: string;
  kind: PulseKind;
  label: string;
  ttlMinutes?: number;
};

export type MerchantStats = {
  generated: number;
  accepted: number;
  dismissed: number;
  expired: number;
  redeemed: number;
  acceptanceRate: number;
  recentOffers: Array<{
    offerId: string;
    createdAt: string;
    headline: string;
    status: OfferStatus;
  }>;
};

export type MerchantRule = {
  id: string;
  merchantId: string;
  goal: string;
  maxDiscountPct: number;
  validMinutes: number;
  when: RuleCondition[];
};

// ─── Rule predicates (mirrored from YAML) ───────────────────────────────────

export type NumericComparator = { lt?: number; lte?: number; gt?: number; gte?: number };

export type RuleCondition =
  | { 'weather.condition': WeatherCondition[] }
  | { 'weather.tempC': NumericComparator }
  | { 'demand.self': NumericComparator }
  | { 'time.dayOfWeek': DayOfWeek[] }
  | { 'time.hour': NumericComparator }
  | { 'pulse.fresh_batch': boolean }
  | { 'pulse.just_baked': boolean }
  | { 'pulse.limited_stock': boolean }
  | { 'pulse.end_of_shift': boolean }
  | { 'event.within': { meters: number; startsInMinutes: NumericComparator } }
  | { 'location.inZone': string };

// ─── Generic ────────────────────────────────────────────────────────────────

export type OkResponse = { ok: true };
export type ErrorResponse = { ok: false; error: string };
