/**
 * Internal event shape from any provider. The aggregator computes the API-shape
 * fields (distanceMeters, startsInMinutes) from this + the user's lat/lng.
 */
export type RawEvent = {
  id: string;
  name: string;
  venueLat: number;
  venueLng: number;
  startsAt: string; // ISO
  endsAt?: string;
};

export interface EventsProvider {
  list(cityKey: string): Promise<RawEvent[]>;
}
