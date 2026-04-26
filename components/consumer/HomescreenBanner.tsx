import type { Offer } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface HomescreenBannerProps {
  offer?: Offer | null;
  className?: string;
}

const APPS: Array<{ icon: string; name: string }> = [
  { icon: "📞", name: "Phone" },
  { icon: "✉️", name: "Mail" },
  { icon: "🌐", name: "Safari" },
  { icon: "🎵", name: "Music" },
  { icon: "📷", name: "Camera" },
  { icon: "🗺️", name: "Maps" },
  { icon: "🌤️", name: "Weather" },
  { icon: "📅", name: "Calendar" },
  { icon: "📝", name: "Notes" },
  { icon: "⏰", name: "Clock" },
  { icon: "👛", name: "Wallet" },
  { icon: "⚙️", name: "Settings" },
];

const DOCK_APPS = ["📞", "✉️", "🌐", "🎵"];

export function HomescreenBanner({ offer, className }: HomescreenBannerProps) {
  return (
    <div className={cn("flex h-full flex-col px-5 pb-6 pt-4", className)}>
      <div className="grid flex-1 grid-cols-4 gap-x-4 gap-y-5">
        {APPS.map((app) => (
          <div key={app.name} className="flex flex-col items-center gap-1">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ios-card text-3xl shadow-sm">
              {app.icon}
            </div>
            <span className="text-[10px] text-foreground/80">{app.name}</span>
          </div>
        ))}
      </div>

      {offer && (
        <div className="mb-3 mt-4 animate-in slide-in-from-bottom rounded-2xl bg-ios-card/90 p-3 shadow-md backdrop-blur-md duration-300">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span className="font-medium text-foreground/80">
              {offer.merchantName}
            </span>
            <span>now</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {offer.headline}
          </p>
          {offer.subline && (
            <p className="mt-0.5 text-xs text-foreground/70">{offer.subline}</p>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-ios-card/60 p-2 backdrop-blur-md">
        <div className="grid grid-cols-4 gap-3">
          {DOCK_APPS.map((emoji, i) => (
            <div
              key={i}
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ios-card text-3xl shadow-sm"
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
