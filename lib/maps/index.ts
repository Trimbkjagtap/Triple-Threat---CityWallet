import { google } from './google';
import { osm } from './osm';
import type { MapsProvider } from './provider';

/**
 * Selected via MAPS_PROVIDER env (google | osm). Default: google.
 *
 * Google has the better static map but free SKU caps are 10K events/month each.
 * Flip to osm if billing becomes friction during the hackathon.
 */
export function getMaps(): MapsProvider {
  const choice = process.env.MAPS_PROVIDER ?? 'google';
  if (choice === 'osm') return osm;
  return google;
}

export type { LatLng } from './distance';
export { distanceMeters } from './distance';
export { pointInPolygon } from './geofence';
