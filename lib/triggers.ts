import type { CityConfig, ConfigMerchant, ConfigMerchantRule } from '@/lib/config/types';
import type {
  ContextChip,
  ContextState,
  NumericComparator,
  Trigger,
  WeatherCondition,
  DayOfWeek,
} from '@/lib/types/api';

/**
 * Rule evaluator. Walks every rule on every merchant, records which fire,
 * and returns the highest-priority Trigger.
 *
 * `firedSignals` carries the chips the consumer card will render — they're
 * derived from the *exact* predicates that contributed to the match, so the
 * UI never claims a signal that didn't actually fire.
 */
export function evaluateTriggers(state: ContextState, cfg: CityConfig): Trigger | null {
  const candidates: Trigger[] = [];

  for (const merchant of cfg.merchants) {
    for (const rule of merchant.rules) {
      const result = evaluateRule(state, merchant, rule);
      if (result.matches) {
        candidates.push({
          ruleId: rule.id,
          merchantId: merchant.id,
          priority: rule.priority,
          firedSignals: dedupChips(result.signals),
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

function evaluateRule(
  state: ContextState,
  merchant: ConfigMerchant,
  rule: ConfigMerchantRule,
): { matches: boolean; signals: ContextChip[] } {
  const signals: ContextChip[] = [];

  for (const condition of rule.when) {
    const result = checkPredicate(state, merchant.id, condition);
    if (!result.match) return { matches: false, signals: [] };
    if (result.chip) signals.push(result.chip);
  }

  return { matches: true, signals };
}

// ─── Predicate dispatch ─────────────────────────────────────────────────────

type PredicateResult = { match: boolean; chip?: ContextChip };

function checkPredicate(
  state: ContextState,
  merchantId: string,
  condition: Record<string, unknown>,
): PredicateResult {
  const key = Object.keys(condition)[0];
  const value = condition[key];

  switch (key) {
    case 'weather.condition':
      return checkWeatherCondition(state, value as WeatherCondition[]);
    case 'weather.tempC':
      return checkWeatherTemp(state, value as NumericComparator);
    case 'demand.self':
      return checkDemand(state, merchantId, value as NumericComparator);
    case 'time.dayOfWeek':
      return checkDayOfWeek(state, value as DayOfWeek[]);
    case 'time.hour':
      return checkHour(state, value as NumericComparator);
    case 'pulse.fresh_batch':
    case 'pulse.just_baked':
    case 'pulse.limited_stock':
    case 'pulse.end_of_shift':
      return checkPulse(state, merchantId, key.split('.')[1], value === true);
    case 'event.within':
      return checkEventWithin(
        state,
        value as { meters: number; startsInMinutes: NumericComparator },
      );
    case 'location.inZone':
      return checkInZone(state, value as string);
    default:
      console.warn(`[triggers] unknown predicate: ${key}`);
      return { match: false };
  }
}

function checkWeatherCondition(state: ContextState, conditions: WeatherCondition[]): PredicateResult {
  if (!conditions.includes(state.weather.condition)) return { match: false };
  return { match: true, chip: weatherChip(state.weather.condition) };
}

function checkWeatherTemp(state: ContextState, cmp: NumericComparator): PredicateResult {
  if (!compareNumber(state.weather.tempC, cmp)) return { match: false };
  return {
    match: true,
    chip: { icon: '🌡', label: `${state.weather.tempC}°C`, signalKey: 'weather' },
  };
}

function checkDemand(state: ContextState, merchantId: string, cmp: NumericComparator): PredicateResult {
  const ratio = state.demand.find((d) => d.merchantId === merchantId)?.ratio ?? 1;
  if (!compareNumber(ratio, cmp)) return { match: false };
  return { match: true, chip: { icon: '⏰', label: 'Quiet hour', signalKey: 'demand' } };
}

function checkDayOfWeek(state: ContextState, days: DayOfWeek[]): PredicateResult {
  if (!days.includes(state.time.dayOfWeek)) return { match: false };
  // Don't surface a chip for day-of-week matches — the user already knows what day it is.
  return { match: true };
}

function checkHour(state: ContextState, cmp: NumericComparator): PredicateResult {
  if (!compareNumber(state.time.hour, cmp)) return { match: false };
  return { match: true };
}

function checkPulse(
  state: ContextState,
  merchantId: string,
  kind: string,
  wantTrue: boolean,
): PredicateResult {
  const pulse = state.merchantPulse.find(
    (p) => p.merchantId === merchantId && p.kind === kind,
  );
  const has = pulse !== undefined;
  if (wantTrue && !has) return { match: false };
  if (!wantTrue && has) return { match: false };
  if (has && pulse) {
    return {
      match: true,
      chip: { icon: '✨', label: pulse.label, signalKey: 'pulse' },
    };
  }
  return { match: true };
}

function checkEventWithin(
  state: ContextState,
  v: { meters: number; startsInMinutes: NumericComparator },
): PredicateResult {
  const closest = state.events.find(
    (e) =>
      e.distanceMeters <= v.meters && compareNumber(e.startsInMinutes, v.startsInMinutes),
  );
  if (!closest) return { match: false };
  return { match: true, chip: { icon: '🎫', label: closest.name, signalKey: 'event' } };
}

function checkInZone(state: ContextState, zone: string): PredicateResult {
  if (!state.location.inZones.includes(zone)) return { match: false };
  const label = zone.charAt(0).toUpperCase() + zone.slice(1);
  return { match: true, chip: { icon: '📍', label, signalKey: 'proximity' } };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function compareNumber(value: number, cmp: NumericComparator): boolean {
  if (cmp.lt !== undefined && !(value < cmp.lt)) return false;
  if (cmp.lte !== undefined && !(value <= cmp.lte)) return false;
  if (cmp.gt !== undefined && !(value > cmp.gt)) return false;
  if (cmp.gte !== undefined && !(value >= cmp.gte)) return false;
  return true;
}

function weatherChip(condition: WeatherCondition): ContextChip {
  const map: Record<WeatherCondition, { icon: string; label: string }> = {
    rain: { icon: '🌧', label: 'Rain' },
    drizzle: { icon: '🌦', label: 'Drizzle' },
    snow: { icon: '❄️', label: 'Snow' },
    fog: { icon: '🌫', label: 'Fog' },
    cloud: { icon: '☁️', label: 'Cloudy' },
    clear: { icon: '☀️', label: 'Clear' },
  };
  return { ...map[condition], signalKey: 'weather' };
}

function dedupChips(chips: ContextChip[]): ContextChip[] {
  const seen = new Set<string>();
  return chips.filter((c) => {
    const key = `${c.signalKey}:${c.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
