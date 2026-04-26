"use client";

import type { MerchantStats, OfferStatus } from "@/lib/types/api";

const STATUS_STYLES: Record<OfferStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  accepted: "bg-blue-100 text-blue-700",
  dismissed: "bg-orange-100 text-orange-700",
  expired: "bg-zinc-200 text-zinc-500",
  redeemed: "bg-green-100 text-green-700",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function LiveFeed({
  recentOffers,
}: {
  recentOffers: MerchantStats["recentOffers"];
}) {
  if (recentOffers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ios-divider bg-card p-6 text-center text-sm text-muted-foreground">
        No offers yet. Drop a pulse above to fire one for this merchant.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {recentOffers.map((o, i) => (
        <li
          key={`${o.offerId}-${i}`}
          className="flex items-center justify-between gap-3 rounded-md border border-ios-divider bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{o.headline}</div>
            <div className="text-xs text-muted-foreground">
              {formatTime(o.createdAt)}
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status]}`}
          >
            {o.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
