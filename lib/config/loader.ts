import { readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import type { CityConfig, ConfigMerchant, ConfigMerchantRule } from './types';

/**
 * YAML on disk uses snake_case (max_discount_pct, valid_minutes).
 * We parse + normalize to camelCase once at load time so the rest of the
 * codebase deals with a single shape.
 */
type RawRule = {
  id: string;
  priority?: number;
  when: ConfigMerchantRule['when'];
  max_discount_pct: number;
  valid_minutes: number;
  goal: string;
};

type RawMerchant = Omit<ConfigMerchant, 'rules'> & { rules: RawRule[] };
type RawCity = Omit<CityConfig, 'merchants'> & { merchants: RawMerchant[] };

const cache = new Map<string, CityConfig>();

export async function loadCity(cityKey: string): Promise<CityConfig> {
  const cached = cache.get(cityKey);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), 'config', 'cities', `${cityKey}.yaml`);
  const raw = await readFile(filePath, 'utf8');
  const parsed = yaml.load(raw) as RawCity;

  const config: CityConfig = {
    city: parsed.city,
    center: parsed.center,
    neighborhoods: parsed.neighborhoods,
    events: parsed.events,
    merchants: parsed.merchants.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      location: m.location,
      rules: m.rules.map((r) => ({
        id: r.id,
        priority: r.priority ?? 0,
        when: r.when,
        maxDiscountPct: r.max_discount_pct,
        validMinutes: r.valid_minutes,
        goal: r.goal,
      })),
    })),
  };

  cache.set(cityKey, config);
  return config;
}

/** Test-only escape hatch — clears the in-memory cache. */
export function _clearCityCache(): void {
  cache.clear();
}
