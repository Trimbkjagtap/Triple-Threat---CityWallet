import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getOrFetch } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import { loadCity } from '@/lib/config/loader';
import { ticketmaster } from './ticketmaster';
import type { EventsProvider, RawEvent } from './provider';

/**
 * Events orchestrator — Redis cache + fixtures fallback + YAML seed.
 *
 * Read order:
 *   1. Live provider via getOrFetch (1 hr fresh, 6 hr stale)
 *   2. Fixture file (auto-written on first successful live call)
 *   3. YAML-seeded events from config/cities/{cityKey}.yaml
 *
 * The fixture write is best-effort — silently no-ops on Vercel's read-only fs.
 * Keeps the recorded video stable when Ticketmaster is sparse for Stuttgart.
 */

const provider: EventsProvider = ticketmaster;
const FIXTURES_DIR = path.join(process.cwd(), 'fixtures');

export async function getEvents(cityKey: string): Promise<RawEvent[]> {
  const fresh = await getOrFetch<RawEvent[]>(
    k.events(cityKey),
    () => provider.list(cityKey),
    /* freshSec */ 3600,
    /* staleSec */ 21600,
  );

  if (fresh.length > 0) {
    void persistFixture(cityKey, fresh);
    return fresh;
  }

  const fromFixture = await readFixture(cityKey);
  if (fromFixture && fromFixture.length > 0) return fromFixture;

  return getYamlSeed(cityKey);
}

async function persistFixture(cityKey: string, events: RawEvent[]): Promise<void> {
  if (process.env.VERCEL) return; // serverless fs is read-only
  try {
    await mkdir(FIXTURES_DIR, { recursive: true });
    const filePath = path.join(FIXTURES_DIR, `events-${cityKey}.json`);
    await writeFile(filePath, JSON.stringify(events, null, 2));
  } catch (err) {
    console.warn(`[events] fixture persist failed:`, err);
  }
}

async function readFixture(cityKey: string): Promise<RawEvent[] | null> {
  try {
    const filePath = path.join(FIXTURES_DIR, `events-${cityKey}.json`);
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as RawEvent[];
  } catch {
    return null;
  }
}

async function getYamlSeed(cityKey: string): Promise<RawEvent[]> {
  try {
    const cfg = await loadCity(cityKey);
    return (cfg.events ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      venueLat: e.location.lat,
      venueLng: e.location.lng,
      // js-yaml may parse ISO timestamps to Date — coerce defensively.
      startsAt: new Date(e.starts as unknown as string | Date).toISOString(),
      endsAt: e.ends ? new Date(e.ends as unknown as string | Date).toISOString() : undefined,
    }));
  } catch {
    return [];
  }
}
