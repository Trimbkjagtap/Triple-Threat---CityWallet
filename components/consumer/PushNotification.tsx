"use client";

import { useEffect, useRef } from "react";

import type { Offer } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface PushNotificationProps {
  offer: Offer;
  onTap?: () => void;
  onDismiss?: () => void;
  onAutoExpire?: () => void;
  autoExpireMs?: number;
  appName?: string;
  appIcon?: string;
  timestampLabel?: string;
  className?: string;
}

const SWIPE_DISMISS_PX = 30;
const TAP_TOLERANCE_PX = 6;

export function PushNotification({
  offer,
  onTap,
  onDismiss,
  onAutoExpire,
  autoExpireMs = 8000,
  appName = "City Wallet",
  appIcon = "🏙️",
  timestampLabel = "now",
  className,
}: PushNotificationProps) {
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!onAutoExpire) return;
    const t = setTimeout(() => onAutoExpire(), autoExpireMs);
    return () => clearTimeout(t);
  }, [autoExpireMs, onAutoExpire]);

  const handlePointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (dy > SWIPE_DISMISS_PX) {
      onDismiss?.();
    } else if (Math.abs(dy) < TAP_TOLERANCE_PX) {
      onTap?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter") onTap?.();
        if (e.key === "Escape") onDismiss?.();
      }}
      className={cn(
        "absolute left-1/2 top-14 z-40 w-[92%] -translate-x-1/2 cursor-pointer select-none",
        "rounded-3xl bg-ios-card/85 p-3 shadow-lg backdrop-blur-xl",
        "animate-in fade-in slide-in-from-top duration-300",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-foreground/60">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-ios-accent text-base text-white">
          {appIcon}
        </div>
        <span className="font-medium uppercase tracking-wide text-foreground/70">
          {appName}
        </span>
        <span className="ml-auto">{timestampLabel}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-foreground">
        {offer.headline}
      </p>
      <p className="text-xs leading-snug text-foreground/70">{offer.subline}</p>
    </div>
  );
}
