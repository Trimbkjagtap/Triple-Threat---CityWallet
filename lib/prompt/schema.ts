import { z } from 'zod';

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/);

export const OfferSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  merchantName: z.string(),
  headline: z.string().max(60),
  subline: z.string().max(110),
  discount: z.object({
    type: z.enum(['percent', 'fixed', 'bogo', 'free_addon']),
    value: z.number().optional(),
    description: z.string().optional(),
  }),
  expiresAt: z.string(),
  contextChips: z
    .array(
      z.object({
        icon: z.string(),
        label: z.string(),
        signalKey: z.enum(['weather', 'proximity', 'time', 'demand', 'event', 'pulse']),
      }),
    )
    .min(2)
    .max(4),
  ui: z.object({
    register: z.enum(['warm_emotional', 'factual_urgent', 'playful_energetic', 'quiet_premium']),
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
  cta: z.string().max(20),
  rationale: z.string(),
});

export type OfferFromSchema = z.infer<typeof OfferSchema>;
