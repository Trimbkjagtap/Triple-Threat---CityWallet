"use client";

import { ArrowLeft, Check } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

import { validateRedeemToken } from "@/lib/api-client";
import type { Offer, RedeemTokenResponse } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface RedeemViewProps {
  offer: Offer;
  token: RedeemTokenResponse;
  onBack?: () => void;
  onRedeemed?: () => void;
  pollIntervalMs?: number;
  className?: string;
}

function formatCountdown(expiresAt: string, now: number): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function RedeemView({
  offer,
  token,
  onBack,
  onRedeemed,
  pollIntervalMs = 3000,
  className,
}: RedeemViewProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const onRedeemedRef = useRef(onRedeemed);
  onRedeemedRef.current = onRedeemed;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token.qrPayload, {
      margin: 0,
      width: 240,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then((url) => {
        if (active) setQrSrc(url);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });
    return () => {
      active = false;
    };
  }, [token.qrPayload]);

  useEffect(() => {
    if (redeemed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [redeemed]);

  useEffect(() => {
    if (redeemed) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await validateRedeemToken(token.token);
        if (!active) return;
        if (res.valid) {
          setRedeemed(true);
          onRedeemedRef.current?.();
        }
      } catch {
        // Swallow — next poll retries.
      }
    };
    tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [token.token, pollIntervalMs, redeemed]);

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

      {!redeemed ? (
        <div className="mt-2 flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-wide text-foreground/50">
            Show at counter
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            {offer.merchantName}
          </h2>
          <p className="mt-1 text-sm text-foreground/70">{offer.headline}</p>

          <div className="mt-6 grid h-60 w-60 place-items-center rounded-xl bg-white p-3">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="Redemption QR code"
                className="h-full w-full"
              />
            ) : (
              <span className="text-xs text-foreground/40">
                Generating QR…
              </span>
            )}
          </div>

          <p className="mt-5 font-mono text-3xl tabular-nums text-foreground">
            {formatCountdown(token.expiresAt, now)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground/50">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ios-accent" />
            Awaiting counter scan
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-1 flex-col items-center justify-center text-center duration-300 animate-in fade-in zoom-in-95">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="h-12 w-12" strokeWidth={3} />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-foreground">
            Redeemed
          </h2>
          <p className="mt-1 text-sm text-foreground/70">
            at {offer.merchantName}
          </p>
          <p className="mt-6 text-xs text-foreground/50">{offer.headline}</p>
        </div>
      )}
    </div>
  );
}
