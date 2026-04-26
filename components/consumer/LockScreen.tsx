import type { Offer } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface LockScreenProps {
  offer?: Offer | null;
  time?: string;
  date?: string;
  className?: string;
}

export function LockScreen({
  offer,
  time = "9:41",
  date = "Tuesday, April 25",
  className,
}: LockScreenProps) {
  return (
    <div className={cn("flex h-full flex-col px-6 pt-6", className)}>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/80">{date}</p>
        <h1 className="mt-1 text-[88px] font-thin leading-none tracking-tight text-foreground">
          {time}
        </h1>
      </div>

      {offer && (
        <div className="mt-8 rounded-2xl bg-ios-card/85 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span className="font-medium text-foreground/80">
              {offer.merchantName}
            </span>
            <span>now</span>
          </div>
          <p className="mt-1.5 text-base font-semibold text-foreground">
            {offer.headline}
          </p>
          {offer.contextChips.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {offer.contextChips.map((c) => (
                <span
                  key={c.label}
                  className="rounded-full bg-ios-muted px-2 py-0.5 text-[10px] text-foreground/70"
                >
                  {c.icon} {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
