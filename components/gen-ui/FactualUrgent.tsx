'use client';

import { useEffect, useState } from 'react';
import type { Offer } from '@/lib/types/api';

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function FactualUrgent({ offer }: { offer: Offer }) {
  const countdown = useCountdown(offer.expiresAt);

  return (
    <div className="rounded-2xl shadow-md overflow-hidden bg-white flex flex-col">
      {/* Header band */}
      <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {offer.merchantName}
        </span>
        <span className="text-xs font-mono text-red-400">{countdown}</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Discount value — huge */}
        {offer.discount.value && offer.discount.type === 'percent' && (
          <div className="text-center">
            <span className="text-6xl font-black text-zinc-900">{offer.discount.value}</span>
            <span className="text-2xl font-bold text-zinc-600">%</span>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">off</p>
          </div>
        )}
        {(!offer.discount.value || offer.discount.type !== 'percent') && (
          <p className="text-center text-lg font-bold text-zinc-800">
            {offer.discount.description ?? offer.discount.type}
          </p>
        )}

        {/* Headline */}
        <h2 className="text-base font-bold text-zinc-800 text-center leading-snug">
          {offer.headline}
        </h2>

        {/* Subline */}
        <p className="text-xs text-zinc-500 text-center">{offer.subline}</p>

        {/* Context chips */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {offer.contextChips.map((chip) => (
            <span
              key={chip.label}
              className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full"
            >
              {chip.icon} {chip.label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-red-600 text-red-600 mt-1 hover:bg-red-600 hover:text-white transition-colors"
        >
          {offer.cta}
        </button>
      </div>
    </div>
  );
}
