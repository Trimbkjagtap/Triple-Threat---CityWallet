"use client";

import { useCallback, useEffect, useState } from "react";

import { LockScreen } from "@/components/consumer/LockScreen";
import { OfferCard } from "@/components/consumer/OfferCard";
import { PhoneFrame } from "@/components/consumer/PhoneFrame";
import { PushNotification } from "@/components/consumer/PushNotification";
import { RedeemView } from "@/components/consumer/RedeemView";
import {
  generateOffer,
  getContextState,
  postOfferAction,
  postRedeemToken,
} from "@/lib/api-client";
import type {
  MerchantRule,
  Offer,
  RedeemTokenResponse,
} from "@/lib/types/api";

type ViewState = "idle" | "notified" | "viewing" | "redeeming";

const POLL_MS = 5000;
const SECONDARY_CHANNEL_DELAY_MS = 2000;
const SUPPRESS_DURATION_MS = 24 * 60 * 60 * 1000;
const SUPPRESS_KEY = (merchantId: string) => `suppress:${merchantId}`;

// TODO H14: rule should be fetched server-side from trigger.merchantId.
const STUB_RULE: MerchantRule = {
  id: "stub_rule",
  merchantId: "m_cafe_mueller",
  goal: "fill quiet hours",
  maxDiscountPct: 30,
  validMinutes: 30,
  when: [],
};

function isSuppressed(merchantId: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(SUPPRESS_KEY(merchantId));
  if (!raw) return false;
  return Date.now() < parseInt(raw, 10);
}

function suppress(merchantId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SUPPRESS_KEY(merchantId),
    String(Date.now() + SUPPRESS_DURATION_MS),
  );
}

export default function ConsumerHome() {
  const [view, setView] = useState<ViewState>("idle");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [token, setToken] = useState<RedeemTokenResponse | null>(null);
  const [pushVisible, setPushVisible] = useState(false);
  const [secondaryChannelsLive, setSecondaryChannelsLive] = useState(false);

  // Poll context, fire offer when a trigger arrives.
  useEffect(() => {
    if (offer) return;
    let active = true;

    const tick = async () => {
      const ctx = await getContextState({
        userId: "user_demo",
        lat: 48.7762,
        lng: 9.1822,
        cityKey: "stuttgart",
        intentHint: "warm_drink_seeking",
        behavioral: "strolling",
      });
      if (!active || !ctx.trigger) return;
      if (isSuppressed(ctx.trigger.merchantId)) return;

      const newOffer = await generateOffer({
        contextState: ctx.context,
        trigger: ctx.trigger,
        merchantRule: STUB_RULE,
      });
      if (!active) return;
      setOffer(newOffer);
      setView("notified");
      setPushVisible(true);
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [offer]);

  // After 2s in 'notified', secondary channels (lock-screen widget, homescreen) light up.
  useEffect(() => {
    if (view !== "notified") {
      setSecondaryChannelsLive(false);
      return;
    }
    const t = setTimeout(
      () => setSecondaryChannelsLive(true),
      SECONDARY_CHANNEL_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [view]);

  const clearOffer = useCallback(() => {
    setOffer(null);
    setToken(null);
    setPushVisible(false);
    setSecondaryChannelsLive(false);
    setView("idle");
  }, []);

  const handlePushTap = useCallback(() => {
    setPushVisible(false);
    setView("viewing");
  }, []);

  const handlePushAutoExpire = useCallback(() => {
    setPushVisible(false);
  }, []);

  const handleDismiss = useCallback(async () => {
    if (!offer) return;
    suppress(offer.merchantId);
    await postOfferAction({
      offerId: offer.id,
      action: "dismissed",
      ts: new Date().toISOString(),
    });
    clearOffer();
  }, [offer, clearOffer]);

  const handleAccept = useCallback(async () => {
    if (!offer) return;
    const t = await postRedeemToken(offer.id);
    setToken(t);
    setView("redeeming");
  }, [offer]);

  const handleReplay = useCallback(() => {
    if (offer && typeof window !== "undefined") {
      window.localStorage.removeItem(SUPPRESS_KEY(offer.merchantId));
    }
    clearOffer();
  }, [offer, clearOffer]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ios-bg p-8">
      <PhoneFrame>
        {view === "idle" && <LockScreen />}
        {view === "notified" && (
          <>
            <LockScreen offer={secondaryChannelsLive ? offer : null} />
            {offer && pushVisible && (
              <PushNotification
                offer={offer}
                onTap={handlePushTap}
                onDismiss={handleDismiss}
                onAutoExpire={handlePushAutoExpire}
              />
            )}
          </>
        )}
        {view === "viewing" && offer && (
          <OfferCard
            offer={offer}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        )}
        {view === "redeeming" && offer && token && (
          <RedeemView
            offer={offer}
            token={token}
            onBack={() => setView("viewing")}
          />
        )}
      </PhoneFrame>

      <div className="flex items-center gap-3 text-xs text-foreground/50">
        <span className="font-mono">view: {view}</span>
        <button
          type="button"
          onClick={handleReplay}
          className="rounded-full border border-ios-divider px-3 py-1 hover:bg-ios-muted"
        >
          Replay
        </button>
      </div>
    </main>
  );
}
