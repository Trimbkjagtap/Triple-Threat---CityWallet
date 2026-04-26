"use client";

import { Lock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GenUIPrimitive } from "@/components/gen-ui/registry";
import type { IntentHint, Offer } from "@/lib/types/api";
import { cn } from "@/lib/utils";

import { ContextChips } from "./ContextChips";

const INTENT_LABELS: Record<IntentHint, string> = {
  warm_drink_seeking: "warm drink seeking",
  quick_lunch: "quick lunch",
  window_shopping: "window shopping",
  commuting: "commuting",
  unknown: "browsing",
};

interface OfferCardProps {
  offer: Offer;
  intentHint?: IntentHint;
  onAccept?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function OfferCard({
  offer,
  intentHint = "warm_drink_seeking",
  onAccept,
  onDismiss,
  className,
}: OfferCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-ios-card px-5 pb-5 pt-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground/80">
          {offer.merchantName}
        </span>
        <button
          type="button"
          aria-label="Dismiss offer"
          onClick={onDismiss}
          className="grid h-7 w-7 place-items-center rounded-full bg-ios-muted text-foreground/60 hover:bg-ios-divider"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ContextChips chips={offer.contextChips} className="mt-3" />

      <div className="mt-4 flex-1">
        <GenUIPrimitive register={offer.ui.register} offer={offer} />
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onAccept}
        className="mt-4 w-full rounded-full bg-ios-accent text-white hover:bg-ios-accent/90"
      >
        {offer.cta}
      </Button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-foreground/50">
        <Lock className="h-3 w-3" />
        <span>On device intent: {INTENT_LABELS[intentHint]}</span>
      </div>
    </div>
  );
}
