"use client";

import { useState } from "react";
import { toast } from "sonner";
import { postMerchantPulse } from "@/lib/api-client";
import type { PulseKind } from "@/lib/types/api";

type PulseDef = {
  kind: PulseKind;
  label: string;
  emoji: string;
  description: string;
};

const PULSES: PulseDef[] = [
  {
    kind: "fresh_batch",
    label: "Fresh batch",
    emoji: "☕",
    description: "Just brewed",
  },
  {
    kind: "just_baked",
    label: "Just baked",
    emoji: "🥐",
    description: "Out of the oven",
  },
  {
    kind: "limited_stock",
    label: "Limited stock",
    emoji: "⚡",
    description: "Last few items",
  },
  {
    kind: "end_of_shift",
    label: "End of shift",
    emoji: "🌙",
    description: "Close-out clearance",
  },
];

export function PulseButtons({ merchantId }: { merchantId: string }) {
  const [active, setActive] = useState<PulseKind | null>(null);
  const [pending, setPending] = useState(false);

  const handlePulse = async (def: PulseDef) => {
    setPending(true);
    try {
      await postMerchantPulse({
        merchantId,
        kind: def.kind,
        label: def.description,
        ttlMinutes: 30,
      });
      setActive(def.kind);
      toast.success(`${def.emoji} Pulse fired`, {
        description: `${def.description} · 30 min TTL`,
      });
      // Visual reset after 30 min so the active state is honest
      window.setTimeout(() => setActive(null), 30 * 60 * 1000);
    } catch (err) {
      toast.error("Pulse failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PULSES.map((p) => {
        const isActive = active === p.kind;
        return (
          <button
            key={p.kind}
            type="button"
            disabled={pending}
            onClick={() => handlePulse(p)}
            className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
              isActive
                ? "border-foreground bg-foreground/5"
                : "border-ios-divider bg-card hover:bg-ios-muted"
            }`}
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="text-sm font-semibold leading-tight">{p.label}</span>
            <span className="text-xs text-muted-foreground leading-tight">
              {isActive ? "active · 30 min" : p.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
