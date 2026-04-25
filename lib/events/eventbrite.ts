import type { EventsProvider, RawEvent } from './provider';

/**
 * Eventbrite stub.
 *
 * Eventbrite's public event search was deprecated in 2019; only org-scoped
 * tokens can list events today. This file documents the swap path: when an
 * org token is acquired, replace the throw with a real call against
 * `https://www.eventbriteapi.com/v3/organizations/{org}/events/`.
 *
 * Until then, lib/events/cache.ts will not select this provider.
 */
export const eventbrite: EventsProvider = {
  async list(_cityKey: string): Promise<RawEvent[]> {
    if (!process.env.EVENTBRITE_ORG_TOKEN) {
      throw new Error('Eventbrite not configured — set EVENTBRITE_ORG_TOKEN');
    }
    // TODO: real impl when org token exists.
    throw new Error('Eventbrite live impl not implemented');
  },
};
