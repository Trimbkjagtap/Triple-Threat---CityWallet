// TODO(slot A): real Upstash client + getOrFetch SWR helper.
// See docs/role-A-backend.md H2–H3.

export const redis = {
  // placeholder — replace with `Redis.fromEnv()` from @upstash/redis
  async get<T>(_key: string): Promise<T | null> {
    return null;
  },
  async set(_key: string, _value: unknown, _opts?: { ex?: number }): Promise<'OK'> {
    return 'OK';
  },
};

export async function getOrFetch<T>(
  _key: string,
  fetcher: () => Promise<T>,
  _freshSec: number,
  _staleSec: number,
): Promise<T> {
  // TODO(slot A): SWR with fresh/stale envelope.
  return fetcher();
}
