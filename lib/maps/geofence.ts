import type { LatLng } from './distance';

/**
 * Point-in-polygon test via ray casting. No API. O(n) in vertex count.
 *
 * Polygon is a closed ring of {lat, lng} vertices; we treat the last edge
 * as connecting the last vertex back to the first.
 *
 * Powers the `location.inZone` rule predicate. The aggregator runs this
 * for each neighborhood polygon and populates ContextState.location.inZones.
 */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
}
