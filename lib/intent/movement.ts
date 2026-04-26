const WINDOW_MS = 5 * 60 * 1000; // 5-minute rolling window

interface GeoPoint {
  lat: number;
  lng: number;
  ts: number;
}

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function speedFromBuffer(buffer: GeoPoint[]): number {
  if (buffer.length < 2) return 0;
  let totalDist = 0;
  for (let i = 1; i < buffer.length; i++) {
    totalDist += haversineMeters(buffer[i - 1], buffer[i]);
  }
  const windowSec = (buffer[buffer.length - 1].ts - buffer[0].ts) / 1000;
  return windowSec > 0 ? totalDist / windowSec : 0;
}

function signalFromSpeed(mps: number): string {
  if (mps < 0.5) return 'stationary';
  if (mps < 1.8) return 'strolling';
  return 'commuting';
}

/**
 * Starts a geolocation-based movement classifier.
 * Calls onUpdate with the current behavioral signal whenever location changes.
 * Returns a cleanup function to stop watching.
 *
 * Demo override: set localStorage key 'forceMovement' to one of:
 *   stationary | strolling | commuting | unknown
 */
export function startMovementClassifier(
  onUpdate: (signal: string) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onUpdate('unknown');
    return () => {};
  }

  if (typeof window !== 'undefined') {
    const forced = localStorage.getItem('forceMovement');
    if (forced) {
      onUpdate(forced);
    }
  }

  const buffer: GeoPoint[] = [];

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (typeof window !== 'undefined') {
        const forced = localStorage.getItem('forceMovement');
        if (forced) {
          onUpdate(forced);
          return;
        }
      }

      const now = Date.now();
      buffer.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: now });

      const cutoff = now - WINDOW_MS;
      while (buffer.length > 0 && buffer[0].ts < cutoff) {
        buffer.shift();
      }

      onUpdate(signalFromSpeed(speedFromBuffer(buffer)));
    },
    () => {
      onUpdate('unknown');
    },
    { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
