import { HomescreenBanner } from "@/components/consumer/HomescreenBanner";
import { LockScreen } from "@/components/consumer/LockScreen";
import { PhoneFrame } from "@/components/consumer/PhoneFrame";
import { PushNotification } from "@/components/consumer/PushNotification";
import type { Offer } from "@/lib/types/api";

const MOCK_OFFER: Offer = {
  id: "demo_offer_1",
  merchantId: "m_cafe_mueller",
  merchantName: "Café Müller",
  headline: "Free oat milk on cappuccino",
  subline: "Quiet hour just started — warm one up?",
  discount: { type: "free_addon", description: "Free oat milk upgrade" },
  expiresAt: "2026-04-25T10:11:00.000Z",
  contextChips: [
    { icon: "🌧", label: "Rainy", signalKey: "weather" },
    { icon: "📍", label: "120m away", signalKey: "proximity" },
    { icon: "🕒", label: "Quiet hour", signalKey: "demand" },
  ],
  ui: {
    register: "warm_emotional",
    primaryColor: "#8B4513",
    imageryHint: "steaming_cup",
  },
  cta: "Use offer",
  rationale: "Rain + low demand at café within walking distance",
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-wrap items-center justify-center gap-10 bg-ios-bg p-8">
      <PhoneFrame>
        <LockScreen offer={MOCK_OFFER} />
      </PhoneFrame>
      <PhoneFrame>
        <HomescreenBanner offer={MOCK_OFFER} />
      </PhoneFrame>
      <PhoneFrame>
        <LockScreen />
        <PushNotification offer={MOCK_OFFER} />
      </PhoneFrame>
    </main>
  );
}
