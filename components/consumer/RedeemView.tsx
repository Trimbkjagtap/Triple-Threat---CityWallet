"use client";

import { ArrowLeft } from "lucide-react";

import type { Offer, RedeemTokenResponse } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface RedeemViewProps {
  offer: Offer;
  token: RedeemTokenResponse;
  onBack?: () => void;
  className?: string;
}

export function RedeemView({
  offer,
  token,
  onBack,
  className,
}: RedeemViewProps) {
  return (
    <div className={cn("flex h-full flex-col bg-ios-card p-5", className)}>
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="self-start text-foreground/60 hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-wide text-foreground/50">
          Show at counter
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          {offer.merchantName}
        </h2>
        <p className="mt-1 text-sm text-foreground/70">{offer.headline}</p>

        <div className="mt-6 grid h-48 w-48 place-items-center rounded-xl border border-dashed border-ios-divider bg-ios-bg p-3 text-center text-[10px] font-mono text-foreground/50">
          QR placeholder
          <br />
          (real QR at H7-H8)
          <br />
          {token.token.slice(0, 16)}…
        </div>

        <p className="mt-4 text-xs text-foreground/50">
          Expires {new Date(token.expiresAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
