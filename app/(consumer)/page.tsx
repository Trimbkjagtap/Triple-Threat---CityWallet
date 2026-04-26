"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { DemoControlsPanel } from "@/components/consumer/DemoControlsPanel";
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
  BehavioralSignal,
  IntentHint,
  MerchantRule,
  Offer,
  RedeemTokenResponse,
} from "@/lib/types/api";

type ViewState = "idle" | "notified" | "viewing" | "redeeming";

const POLL_MS = 5000;
const SECONDARY_CHANNEL_DELAY_MS = 2000;
const SUPPRESS_DURATION_MS = 24 * 60 * 60 * 1000;
const SUPPRESS_KEY = (merchantId: string) => `suppress:${merchantId}`;

// In-zone (Altstadt) and out-of-zone coordinates for the geofence demo override.
const COORDS_IN_ZONE = { lat: 48.7762, lng: 9.1822 };
const COORDS_OUT_OF_ZONE = { lat: 48.79, lng: 9.21 };

// Sent over the wire because the legacy contract still requires it. The backend
// looks up the real rule from city YAML by trigger.ruleId and ignores this body.
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

export default function ConsumerHomePage() {
  return (
    <Suspense fallback={null}>
      <ConsumerHome />
    </Suspense>
  );
}

function ConsumerHome() {
  const searchParams = useSearchParams();
  const showDemoControls = useMemo(
    () =>
      process.env.NODE_ENV !== "production" || searchParams.has("demo"),
    [searchParams],
  );
  const showDebugStrip = process.env.NODE_ENV !== "production";

  const [view, setView] = useState<ViewState>("idle");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [token, setToken] = useState<RedeemTokenResponse | null>(null);
  const [pushVisible, setPushVisible] = useState(false);
  const [secondaryChannelsLive, setSecondaryChannelsLive] = useState(false);

  // Demo override state
  const [behavioral, setBehavioral] = useState<BehavioralSignal>("strolling");
  const [intentHint, setIntentHint] =
    useState<IntentHint>("warm_drink_seeking");
  const [forceInZone, setForceInZone] = useState(true);
  const [demoForceRule, setDemoForceRule] = useState<string | null>(null);
  const [demoQuiet, setDemoQuiet] = useState<string | null>(null);

  // Poll context, fire offer when a trigger arrives.
  useEffect(() => {
    if (offer) return;
    let active = true;

    const tick = async () => {
      try {
        const coords = forceInZone ? COORDS_IN_ZONE : COORDS_OUT_OF_ZONE;
        const ctx = await getContextState({
          userId: "user_demo",
          lat: coords.lat,
          lng: coords.lng,
          cityKey: "stuttgart",
          intentHint,
          behavioral,
          ...(demoForceRule ? { demoForceRule } : {}),
          ...(demoQuiet ? { demoQuiet } : {}),
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
      } catch (err) {
        console.warn("[consumer] tick failed:", err);
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [offer, behavioral, intentHint, forceInZone, demoForceRule, demoQuiet]);

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
    const merchantName = offer.merchantName;
    suppress(offer.merchantId);
    toast(`You won't see offers from ${merchantName} for 24 hours`, {
      description: "Tap Replay below to test again.",
    });
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

  const handleResetOverrides = useCallback(() => {
    setBehavioral("strolling");
    setIntentHint("warm_drink_seeking");
    setForceInZone(true);
    setDemoForceRule(null);
    setDemoQuiet(null);
  }, []);

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

      {showDebugStrip && (
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
      )}

      {showDemoControls && (
        <DemoControlsPanel
          behavioral={behavioral}
          setBehavioral={setBehavioral}
          intentHint={intentHint}
          setIntentHint={setIntentHint}
          forceInZone={forceInZone}
          setForceInZone={setForceInZone}
          demoForceRule={demoForceRule}
          setDemoForceRule={setDemoForceRule}
          demoQuiet={demoQuiet}
          setDemoQuiet={setDemoQuiet}
          view={view}
          setView={setView}
          hasOffer={offer !== null}
          onReset={handleResetOverrides}
        />
      )}
    </main>
  );
}
