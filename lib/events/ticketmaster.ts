import type { EventsProvider, RawEvent } from './provider';

/**
 * Default events provider — Ticketmaster Discovery API.
 *
 * Free tier: 5000 calls/day, 5 req/sec. We cache aggressively (1 hr fresh,
 * 6 hr stale) so a typical hackathon run stays well under the cap.
 *
 * Brief lists "Eventbrite / Local event APIs" but Eventbrite's public search
 * was deprecated in 2019 — Ticketmaster is the right swap. Eventbrite stub
 * lives next to this file for the documented swap path.
 */

const CITY_TO_QUERY: Record<string, { city: string; countryCode: string }> = {
  stuttgart: { city: 'Stuttgart', countryCode: 'DE' },
};

export const ticketmaster: EventsProvider = {
  async list(cityKey: string): Promise<RawEvent[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return [];

    const query = CITY_TO_QUERY[cityKey];
    if (!query) return [];

    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    url.searchParams.set('city', query.city);
    url.searchParams.set('countryCode', query.countryCode);
    url.searchParams.set('radius', '5');
    url.searchParams.set('unit', 'km');
    url.searchParams.set('size', '20');
    url.searchParams.set('sort', 'date,asc');
    url.searchParams.set('apikey', apiKey);

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
      if (!res.ok) {
        console.warn(`[ticketmaster] ${cityKey} → ${res.status}`);
        return [];
      }
      const json = (await res.json()) as TmResponse;
      const events = json._embedded?.events ?? [];
      return events.map(toRawEvent).filter((e): e is RawEvent => e !== null);
    } catch (err) {
      console.warn(`[ticketmaster] fetch failed for ${cityKey}:`, err);
      return [];
    }
  },
};

function toRawEvent(e: TmEvent): RawEvent | null {
  const venue = e._embedded?.venues?.[0];
  const lat = venue?.location?.latitude ? Number(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? Number(venue.location.longitude) : null;
  const startsAt = e.dates?.start?.dateTime ?? null;

  if (!e.id || !e.name || lat === null || lng === null || !startsAt) return null;

  return {
    id: e.id,
    name: e.name,
    venueLat: lat,
    venueLng: lng,
    startsAt,
  };
}

// ─── Ticketmaster response types (just what we use) ──────────────────────────

type TmEvent = {
  id?: string;
  name?: string;
  dates?: { start?: { dateTime?: string } };
  _embedded?: {
    venues?: Array<{ location?: { latitude?: string; longitude?: string } }>;
  };
};

type TmResponse = {
  _embedded?: { events?: TmEvent[] };
};
