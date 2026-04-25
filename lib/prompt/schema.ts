// TODO(slot B): full Zod schema for Offer with field-level constraints.
// See docs/role-B-genui.md H2–H3.
// Must mirror the Offer type in lib/types/api.ts exactly.

import { z } from 'zod';

export const OfferSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  merchantName: z.string(),
  headline: z.string(),
  subline: z.string(),
  discount: z.object({
    type: z.enum(['percent', 'fixed', 'bogo', 'free_addon']),
    value: z.number().optional(),
    description: z.string().optional(),
  }),
  expiresAt: z.string(),
  contextChips: z.array(
    z.object({
      icon: z.string(),
      label: z.string(),
      signalKey: z.enum(['weather', 'proximity', 'time', 'demand', 'event', 'pulse']),
    }),
  ),
  ui: z.object({
    register: z.enum(['warm_emotional', 'factual_urgent', 'playful_energetic', 'quiet_premium']),
    primaryColor: z.string(),
    accent: z.string().optional(),
    imageryHint: z.enum([
      'steaming_cup',
      'sunny_terrace',
      'bakery_shelf',
      'evening_pour',
      'bookshop_corner',
      'rainy_window',
      'morning_pastry',
      'bench_break',
    ]),
  }),
  cta: z.string(),
  rationale: z.string(),
});

export type OfferFromSchema = z.infer<typeof OfferSchema>;
