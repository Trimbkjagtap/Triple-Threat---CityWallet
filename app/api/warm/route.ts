import { NextResponse } from 'next/server';
import { getWeather } from '@/lib/context/weather';
import { getDemand } from '@/lib/context/payone';
import { getEvents } from '@/lib/events/cache';
import { loadCity } from '@/lib/config/loader';

/**
 * Pre-warm caches for a city. Hit this once before recording the demo
 * so the first viewer's request never pays an external API cost.
 *
 * Idempotent. Returns per-signal status so you can confirm what got
 * populated (and what failed silently).
 *
 * Vercel deploy hook can be configured to call /api/warm?cityKey=stuttgart
 * post-deploy.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cityKey = url.searchParams.get('cityKey') ?? 'stuttgart';

  const t0 = Date.now();
  let merchantIds: string[];
  try {
    const cfg = await loadCity(cityKey);
    merchantIds = cfg.merchants.map((m) => m.id);
  } catch {
    return NextResponse.json(
      { ok: false, error: `unknown_city: ${cityKey}` },
      { status: 400 },
    );
  }

  const [weatherR, eventsR, demandR] = await Promise.allSettled([
    getWeather(cityKey),
    getEvents(cityKey),
    getDemand(merchantIds),
  ]);

  return NextResponse.json({
    ok: true,
    cityKey,
    merchantCount: merchantIds.length,
    totalMs: Date.now() - t0,
    weather: summarize(weatherR, (w) => `${w.tempC}°C ${w.condition} (${w.summary})`),
    events: summarize(eventsR, (ev) => `${ev.length} events cached`),
    demand: summarize(demandR, (d) => `${d.length} merchants demand snapshot`),
  });
}

function summarize<T>(r: PromiseSettledResult<T>, describe: (v: T) => string) {
  return r.status === 'fulfilled'
    ? { ok: true, sample: describe(r.value) }
    : {
        ok: false,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
}
