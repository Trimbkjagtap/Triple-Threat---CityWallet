import type { Offer, ImageryHint } from '@/lib/types/api';
import { WarmEmotional } from './WarmEmotional';
import { FactualUrgent } from './FactualUrgent';
import { PlayfulEnergetic } from './PlayfulEnergetic';

export const registry = {
  warm_emotional: WarmEmotional,
  factual_urgent: FactualUrgent,
  playful_energetic: PlayfulEnergetic,
} as const;

export type GenUIRegister = keyof typeof registry;

export function GenUIPrimitive({ register, offer }: { register: string; offer: Offer }) {
  const Component = registry[register as GenUIRegister] ?? registry.warm_emotional;
  return <Component offer={offer} />;
}

export function resolveImageSrc(hint: ImageryHint): string {
  return `/img/imagery/${hint}.jpg`;
}
