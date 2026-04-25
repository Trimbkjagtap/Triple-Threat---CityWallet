import type { LatLng } from './distance';

export type StaticMapArgs = {
  center: LatLng;
  zoom: number;
  width: number;
  height: number;
};

export interface MapsProvider {
  /** Returns a fully-formed image URL. Server-only (key never reaches the client). */
  staticMapUrl(args: StaticMapArgs): string;
  /** Address → coords. Returns null if not found. */
  geocode(address: string): Promise<LatLng | null>;
}
