"use client";

import type { MerchantStats } from "@/lib/types/api";

const CARDS: Array<{ key: keyof MerchantStats; label: string; tone: string }> = [
  { key: "generated", label: "Generated", tone: "text-zinc-700" },
  { key: "accepted", label: "Accepted", tone: "text-blue-700" },
  { key: "dismissed", label: "Dismissed", tone: "text-orange-700" },
  { key: "expired", label: "Expired", tone: "text-zinc-500" },
  { key: "redeemed", label: "Redeemed", tone: "text-green-700" },
];

export function StatsGrid({ stats }: { stats: MerchantStats | null }) {
  const acceptanceRate = stats ? Math.round(stats.acceptanceRate * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ios-divider bg-card p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Acceptance rate
        </div>
        <div className="mt-1 text-4xl font-bold text-foreground">
          {acceptanceRate}
          <span className="text-2xl text-muted-foreground">%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CARDS.map((c) => (
          <div
            key={c.key}
            className="rounded-lg border border-ios-divider bg-card p-3"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.label}
            </div>
            <div className={`mt-0.5 text-2xl font-bold ${c.tone}`}>
              {(stats?.[c.key] as number | undefined) ?? 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
