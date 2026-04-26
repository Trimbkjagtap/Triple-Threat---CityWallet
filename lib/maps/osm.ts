import { getOrFetch } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import type { LatLng } from './distance';
import type { MapsProvider, StaticMapArgs } from './provider';

/**
 * OpenStreetMap fallback provider.
 *
 * Static maps: staticmap.openstreetmap.de — keyless, simple URL params.
 *   Acceptable as a phone-frame background; not as crisp as Google but free
 *   and unmetered.
 *
 * Geocoding: Nominatim — keyless, requires a unique User-Agent header.
 *   Rate limit 1 req/sec per their usage policy. We cache geocodes ~30 days
 *   so a hackathon hit rate stays well under the limit.
 */
export const osm: MapsProvider = {
  staticMapUrl({ center, zoom, width, height }: StaticMapArgs): string {
    const params = new URLSearchParams({
      center: `${center.lat},${center.lng}`,
      zoom: String(zoom),
      size: `${width}x${height}`,
      maptype: 'mapnik',
    });
    return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
  },

  async geocode(address: string): Promise<LatLng | null> {
    return getOrFetch<LatLng | null>(
      k.geocode(`osm:${hashAddress(address)}`),
      async () => {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', address);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '1');
        try {
          const res = await fetch(url.toString(), {
            headers: {
              'User-Agent':
                process.env.OSM_USER_AGENT ?? 'city-wallet-hackathon/1.0',
            },
            signal: AbortSignal.timeout(3000),
          });
          if (!res.ok) return null;
          const json = (await res.json()) as NominatimResult[];
          const first = json[0];
          if (!first) return null;
          return { lat: Number(first.lat), lng: Number(first.lon) };
        } catch (err) {
          console.warn(`[osm.geocode] failed for "${address}":`, err);
          return null;
        }
      },
      60 * 60 * 24 * 30,
      60 * 60 * 24 * 30,
    );
  },
};

function hashAddress(address: string): string {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

type NominatimResult = { lat: string; lon: string };
