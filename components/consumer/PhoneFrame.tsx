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
            <div className="h-full w-full bg-gradient-to-b from-ios-muted to-ios-bg" />
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
