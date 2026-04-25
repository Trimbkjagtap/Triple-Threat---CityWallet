'use client';

import Image from 'next/image';
import type { Offer } from '@/lib/types/api';
import { resolveImageSrc } from './registry';

export function WarmEmotional({ offer }: { offer: Offer }) {
  const expiresAt = new Date(offer.expiresAt);
  const expiryStr = expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl shadow-md overflow-hidden bg-stone-50 flex flex-col">
      {/* Imagery */}
      <div className="relative h-44 w-full bg-amber-100">
        <Image
          src={resolveImageSrc(offer.ui.imageryHint)}
          alt={offer.merchantName}
          fill
          className="object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Context chips */}
        <div className="flex flex-wrap gap-1.5">
          {offer.contextChips.map((chip) => (
            <span
              key={chip.label}
              className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full"
            >
              {chip.icon} {chip.label}
            </span>
          ))}
        </div>

        {/* Headline */}
        <h2 className="font-serif text-xl text-stone-800 leading-snug">
          {offer.headline}
        </h2>

        {/* Subline */}
        <p className="text-sm text-stone-500 leading-relaxed">{offer.subline}</p>

        {/* Discount */}
        {offer.discount.value && (
          <p className="text-base font-semibold text-amber-700">
            {offer.discount.type === 'percent'
              ? `${offer.discount.value}% off`
              : offer.discount.description ?? `Save ${offer.discount.value}`}
          </p>
        )}

        {/* CTA */}
        <button
          className="w-full py-2.5 rounded-xl text-white text-sm font-medium mt-1"
          style={{ backgroundColor: offer.ui.primaryColor }}
        >
          {offer.cta}
        </button>

        {/* Expiry */}
        <p className="text-xs text-center text-stone-400">Offer expires at {expiryStr}</p>
      </div>
    </div>
  );
}
