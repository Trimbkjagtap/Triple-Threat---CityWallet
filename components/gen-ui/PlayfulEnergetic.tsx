'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Offer } from '@/lib/types/api';
import { resolveImageSrc } from './registry';

export function PlayfulEnergetic({ offer }: { offer: Offer }) {
  const accent = offer.ui.accent ?? '#FBBF24';
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="rounded-2xl shadow-md overflow-hidden flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${offer.ui.primaryColor}22 0%, ${accent}33 100%)`,
      }}
    >
      {/* Image + content side-by-side on md+, stacked on mobile */}
      <div className="flex flex-col sm:flex-row">
        {/* Image column — falls back to register gradient if missing */}
        <div
          className="relative h-40 sm:h-auto sm:w-2/5 flex-shrink-0"
          style={
            imgFailed
              ? { background: `linear-gradient(135deg, ${offer.ui.primaryColor}, ${accent})` }
              : { backgroundColor: '#FEF3C7' }
          }
        >
          {!imgFailed && (
            <Image
              src={resolveImageSrc(offer.ui.imageryHint)}
              alt={offer.merchantName}
              fill
              className="object-cover"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 p-4 flex flex-col gap-2.5">
          {/* Context chips — bigger on this register */}
          <div className="flex flex-wrap gap-1.5">
            {offer.contextChips.map((chip) => (
              <span
                key={chip.label}
                className="text-sm font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: offer.ui.primaryColor }}
              >
                {chip.icon} {chip.label}
              </span>
            ))}
          </div>

          {/* Headline */}
          <h2 className="text-xl font-extrabold leading-tight" style={{ color: offer.ui.primaryColor }}>
            {offer.headline}
          </h2>

          {/* Subline */}
          <p className="text-sm text-zinc-600">{offer.subline}</p>

          {/* Discount */}
          {offer.discount.value !== undefined && (
            <p className="text-sm font-bold" style={{ color: accent }}>
              {offer.discount.type === 'percent'
                ? `${offer.discount.value}% off`
                : offer.discount.description ?? `Save ${offer.discount.value}`}
            </p>
          )}

          {/* CTA pill */}
          <button
            className="mt-1 self-start px-5 py-2 rounded-full text-sm font-bold text-white shadow-md"
            style={{
              background: `linear-gradient(90deg, ${offer.ui.primaryColor}, ${accent})`,
            }}
          >
            {offer.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
