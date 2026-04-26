import { loadCity } from '@/lib/config/loader';
import { getWeather } from './weather';
import { getDemand } from './payone';
import { getPulses } from './inventoryPulse';
import { getEvents } from '@/lib/events/cache';
import { distanceMeters } from '@/lib/maps/distance';
import { pointInPolygon } from '@/lib/maps/geofence';
import type {
  BehavioralSignal,
  ContextState,
  DayOfWeek,
  EventInfo,
  IntentHint,
  TimePeriod,
} from '@/lib/types/api';

export type AggregateInput = {
  userId: string;
  lat: number;
  lng: number;
  cityKey: string;
  intentHint: IntentHint;
  behavioral: BehavioralSignal;
};

/**
 * The hub. Pulls every signal in parallel, runs the geofence pass, mints a
 * timestamp, and assembles a ContextState. The trigger engine evaluates rules
 * against the resulting state — never against raw fetcher output.
 */
export async function aggregate(input: AggregateInput): Promise<ContextState> {
  const cfg = await loadCity(input.cityKey);
  const merchantIds = cfg.merchants.map((m) => m.id);

  const [weather, demand, pulses, rawEvents] = await Promise.all([
    getWeather(input.cityKey),
    getDemand(merchantIds),
    getPulses(merchantIds),
    getEvents(input.cityKey),
  ]);

  const userPoint = { lat: input.lat, lng: input.lng };

  const inZones = cfg.neighborhoods
    .filter((n) => pointInPolygon(userPoint, n.polygon))
    .map((n) => n.id);

  const now = Date.now();
  const events: EventInfo[] = rawEvents.map((e) => ({
    id: e.id,
    name: e.name,
    distanceMeters: Math.round(
      distanceMeters(userPoint, { lat: e.venueLat, lng: e.venueLng }),
    ),
    startsInMinutes: Math.max(
      0,
      Math.round((new Date(e.startsAt).getTime() - now) / 60_000),
    ),
  }));

  const date = new Date();
  const hour = date.getHours();

  return {
    userId: input.userId,
    weather,
    time: {
      iso: date.toISOString(),
      hour,
      dayOfWeek: dayKey(date),
      period: periodForHour(hour),
    },
    location: {
      cityKey: input.cityKey,
      lat: input.lat,
      lng: input.lng,
      inZones,
      neighborhoodId: inZones[0],
    },
    demand,
    merchantPulse: pulses,
    events,
    behavioral: input.behavioral,
    intentHint: input.intentHint,
  };
}

function dayKey(date: Date): DayOfWeek {
  const keys: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return keys[date.getDay()];
}

function periodForHour(hour: number): TimePeriod {
  if (hour < 6) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}
