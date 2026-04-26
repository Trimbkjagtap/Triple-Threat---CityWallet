import type { RuleCondition } from '@/lib/types/api';
import type { LatLng } from '@/lib/maps/distance';

/**
 * Internal config shape produced by the YAML loader.
 * Snake_case YAML fields are normalized to camelCase here,
 * and rule predicates are typed via RuleCondition.
 */
export type Neighborhood = {
  id: string;
  name: string;
  polygon: LatLng[];
};

export type ConfigMerchantRule = {
  id: string;
  priority: number;
  when: RuleCondition[];
  maxDiscountPct: number;
  validMinutes: number;
  goal: string;
};

export type ConfigMerchant = {
  id: string;
  name: string;
  category: string;
  location: LatLng;
  rules: ConfigMerchantRule[];
};

export type ConfigEventSeed = {
  id: string;
  name: string;
  location: LatLng;
  starts: string;
  ends: string;
};

export type CityConfig = {
  city: string;
  center: LatLng;
  neighborhoods: Neighborhood[];
  merchants: ConfigMerchant[];
  events?: ConfigEventSeed[];
};
