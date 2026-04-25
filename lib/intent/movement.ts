import type { BehavioralSignal } from '@/lib/types/api';

export type { BehavioralSignal };

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

function signalFromSpeed(mps: number): BehavioralSignal {
  if (mps < 0.5) return 'stationary';
  if (mps < 1.8) return 'strolling';
  return 'commuting';
}

/**
 * Starts a geolocation-based movement classifier.
 * Calls onUpdate with the current BehavioralSignal whenever location changes.
 * Returns a cleanup function to stop watching.
 *
 * Demo override: set localStorage key 'forceMovement' to one of:
 *   stationary | strolling | commuting | unknown
 */
export function startMovementClassifier(
  onUpdate: (signal: BehavioralSignal) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onUpdate('unknown');
    return () => {};
  }

  // Check demo override first
  if (typeof window !== 'undefined') {
    const forced = localStorage.getItem('forceMovement');
    if (forced) {
      onUpdate(forced as BehavioralSignal);
      // Still set up real watch so override can be removed at runtime
    }
  }

  const buffer: GeoPoint[] = [];

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      // Demo override takes priority
      if (typeof window !== 'undefined') {
        const forced = localStorage.getItem('forceMovement');
        if (forced) {
          onUpdate(forced as BehavioralSignal);
          return;
        }
      }

      const now = Date.now();
      buffer.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: now });

      // Purge entries older than 5 minutes
      const cutoff = now - WINDOW_MS;
      while (buffer.length > 0 && buffer[0].ts < cutoff) {
        buffer.shift();
      }

      const mps = speedFromBuffer(buffer);
      onUpdate(signalFromSpeed(mps));
    },
    () => {
      onUpdate('unknown');
    },
    { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
