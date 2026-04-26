'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Offer } from '@/lib/types/api';
import { resolveImageSrc } from './registry';

/**
 * QuietPremium register — minimal, refined, understated.
 *
 * Use case: evening, premium category (wine bar, bookshop, fine dining),
 * user is calm. Reads as "an evening pour, just for you" — no superlatives,
 * lots of whitespace, light serif, off-white background.
 *
 * Visually distinct from warm_emotional (which is warm/intimate) by being
 * cooler and more restrained: thin accent border, narrow imagery strip,
 * underlined-link CTA instead of filled button, generous padding.
 */
export function QuietPremium({ offer }: { offer: Offer }) {
  const expiresAt = new Date(offer.expiresAt);
  const expiryStr = expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [imgFailed, setImgFailed] = useState(false);
  const accent = offer.ui.accent ?? '#475569'; // slate-600 default

  return (
    <div
      className="rounded-xl overflow-hidden bg-stone-50 flex flex-col"
      style={{ borderLeft: `3px solid ${offer.ui.primaryColor}` }}
    >
      {/* Thin imagery strip at top — not a hero image, more of a flourish */}
      <div
        className="relative h-24 w-full"
        style={
          imgFailed
            ? { background: 'linear-gradient(180deg, #F8F6F1 0%, #E8E4DC 100%)' }
            : { backgroundColor: '#F8F6F1' }
        }
      >
        {!imgFailed && (
          <Image
            src={resolveImageSrc(offer.ui.imageryHint)}
            alt={offer.merchantName}
            fill
            className="object-cover opacity-90"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      <div className="px-6 py-5 flex flex-col gap-3">
        {/* Merchant name as small uppercase eyebrow */}
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: accent }}
        >
          {offer.merchantName}
        </p>

        {/* Headline — light serif */}
        <h2 className="font-serif text-xl font-light text-stone-800 leading-snug">
          {offer.headline}
        </h2>

        {/* Subline */}
        <p className="text-sm text-stone-500 leading-relaxed">{offer.subline}</p>

        {/* Context chips — tiny, no background pills, just text */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {offer.contextChips.map((chip) => (
            <span key={chip.label} className="text-xs text-stone-400">
              {chip.icon} {chip.label}
            </span>
          ))}
        </div>

        {/* Discount — small, restrained */}
        {offer.discount.value !== undefined && (
          <p className="text-sm text-stone-700">
            {offer.discount.type === 'percent'
              ? `${offer.discount.value}% off`
              : offer.discount.description ?? `Save ${offer.discount.value}`}
          </p>
        )}

        {/* CTA — underlined link style, not a filled button */}
        <button
          className="self-start mt-2 text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity"
          style={{ color: offer.ui.primaryColor }}
        >
          {offer.cta}
        </button>

        {/* Expiry */}
        <p className="text-xs text-stone-400 pt-1">Until {expiryStr}</p>
      </div>
    </div>
  );
}
