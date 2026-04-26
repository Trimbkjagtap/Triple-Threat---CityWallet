import { NextResponse } from 'next/server';
import { getMaps } from '@/lib/maps';
import { loadCity } from '@/lib/config/loader';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cityKey = url.searchParams.get('cityKey') ?? 'stuttgart';
  const zoom = Number(url.searchParams.get('zoom') ?? '16');
  const width = Number(url.searchParams.get('width') ?? '400');
  const height = Number(url.searchParams.get('height') ?? '800');

  let cfg;
  try {
    cfg = await loadCity(cityKey);
  } catch {
    return NextResponse.json({ ok: false, error: 'unknown_city' }, { status: 400 });
  }

  const maps = getMaps();
  const mapUrl = maps.staticMapUrl({
    center: cfg.center,
    zoom: Number.isFinite(zoom) ? zoom : 16,
    width: Number.isFinite(width) ? width : 400,
    height: Number.isFinite(height) ? height : 800,
  });

  // Cache aggressively — the URL is deterministic for a given (cityKey, zoom, size).
  return NextResponse.json(
    { ok: true, url: mapUrl },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
