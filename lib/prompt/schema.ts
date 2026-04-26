import { z } from 'zod';

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/);

const contextChipSchema = z.object({
  icon: z.string(),
  label: z.string(),
  signalKey: z.enum(['weather', 'proximity', 'time', 'demand', 'event', 'pulse']),
});

export const OfferSchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().min(1),
  merchantName: z.string().min(1),
  // Char limits aligned with the prompt's word rules:
  //   headline ≤ 8 words → ~50 chars
  //   subline  ≤ 14 words → ~90 chars
  headline: z.string().min(1).max(50),
  subline: z.string().min(1).max(90),
  discount: z.object({
    type: z.enum(['percent', 'fixed', 'bogo', 'free_addon']),
    value: z.number().optional(),
    description: z.string().optional(),
  }),
  expiresAt: z.string(),
  // Brief: "≥2 visible context signals" — schema enforces 2..4 chips so the
  // model can't drop the count and break the M1.4 deliverable.
  contextChips: z.array(contextChipSchema).min(2).max(4),
  ui: z.object({
    // quiet_premium intentionally NOT here: no UI primitive ships for it,
    // model picking it would silently fall back to warm_emotional.
    register: z.enum(['warm_emotional', 'factual_urgent', 'playful_energetic']),
    primaryColor: hexColor,
    accent: hexColor.optional(),
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
  cta: z.string().min(1).max(20),
  rationale: z.string(),
});

export type OfferFromSchema = z.infer<typeof OfferSchema>;
