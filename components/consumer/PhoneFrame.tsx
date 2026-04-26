"use client";

import { useEffect, useState } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";

import { cn } from "@/lib/utils";

interface PhoneFrameProps {
  children?: React.ReactNode;
  mapSlot?: React.ReactNode;
  time?: string;
  className?: string;
}

export function PhoneFrame({
  children,
  mapSlot,
  time = "9:41",
  className,
}: PhoneFrameProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMapUrl() {
      try {
        const res = await fetch(
          "/api/maps/static-url?cityKey=stuttgart&zoom=16&width=400&height=800",
        );
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean; url?: string };
        if (!cancelled && data.ok && data.url) {
          setMapUrl(data.url);
        }
      } catch {
        // Swallow — gradient fallback already handles the null state.
      }
    }

    fetchMapUrl();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={cn(
        "relative h-[844px] w-[390px] rounded-[55px] bg-black p-[14px] shadow-2xl",
        className,
      )}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-ios-bg">
        <div className="absolute inset-0">
          {mapSlot ?? (
            mapUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mapUrl}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover opacity-60 saturate-50 [filter:saturate(0.5)_brightness(1.05)]"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-b from-ios-muted to-ios-bg" />
            )
          )}
        </div>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 pt-3 text-sm font-semibold text-foreground">
          <span>{time}</span>
          <div className="flex items-center gap-1.5">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryFull className="h-4 w-4" />
          </div>
        </div>

        <div className="absolute left-1/2 top-2.5 z-30 h-[34px] w-[126px] -translate-x-1/2 rounded-full bg-black" />

        <div className="absolute inset-0 z-10 pt-12">{children}</div>

        <div className="absolute bottom-1.5 left-1/2 z-30 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/70" />
      </div>
    </div>
  );
}
