import { getOrFetch } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { LatLng } from './distance';
import type { MapsProvider, StaticMapArgs } from './provider';

/**
 * Google Maps Platform — Static Maps + Geocoding API.
 * Server-side only; the API key never reaches the client.
 *
 * Free tier (as of 2026): 10,000 events/month per SKU. Restrict the key
 * to localhost + the Vercel domain in the Google Cloud console and set a
 * daily cap to prevent surprise bills.
 */
export const google: MapsProvider = {
  staticMapUrl({ center, zoom, width, height }: StaticMapArgs): string {
    const key = process.env.GOOGLE_MAPS_API_KEY ?? '';
    const params = new URLSearchParams({
      center: `${center.lat},${center.lng}`,
      zoom: String(zoom),
      size: `${width}x${height}`,
      scale: '2',
      maptype: 'roadmap',
      key,
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  },

  async geocode(address: string): Promise<LatLng | null> {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return null;

    return getOrFetch<LatLng | null>(
      k.geocode(hashAddress(address)),
      async () => {
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        url.searchParams.set('address', address);
        url.searchParams.set('key', key);
        try {
          const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
          if (!res.ok) return null;
          const json = (await res.json()) as GoogleGeocodeResponse;
          const loc = json.results?.[0]?.geometry?.location;
          if (!loc) return null;
          return { lat: loc.lat, lng: loc.lng };
        } catch (err) {
          console.warn(`[google.geocode] failed for "${address}":`, err);
          return null;
        }
      },
      /* freshSec  ~30 days */ 60 * 60 * 24 * 30,
      /* staleSec  ~30 days */ 60 * 60 * 24 * 30,
    );
  },
};

function hashAddress(address: string): string {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

type GoogleGeocodeResponse = {
  results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
};
