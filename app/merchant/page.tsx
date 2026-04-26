"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LiveFeed } from "@/components/merchant/LiveFeed";
import { PulseButtons } from "@/components/merchant/PulseButtons";
import { StatsGrid } from "@/components/merchant/StatsGrid";
import { getMerchantStats } from "@/lib/api-client";
import type { MerchantStats } from "@/lib/types/api";

// Mirrored from config/cities/stuttgart.yaml. Could be loaded server-side
// but the merchant list rarely changes — hardcoded keeps the page client-only.
const MERCHANTS = [
  { id: "m_cafe_mueller", name: "Café Müller", category: "cafe" },
  { id: "m_baeckerei_schmidt", name: "Bäckerei Schmidt", category: "bakery" },
  { id: "m_buchladen_wittwer", name: "Buchladen Wittwer", category: "bookshop" },
  { id: "m_weinbar_schiller", name: "Weinbar Schiller", category: "wine_bar" },
  { id: "m_eis_genuss", name: "Eis & Genuss", category: "gelato" },
];

const POLL_MS = 2500;

export default function MerchantDashboard() {
  const [merchantId, setMerchantId] = useState(MERCHANTS[0].id);
  const [stats, setStats] = useState<MerchantStats | null>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const s = await getMerchantStats(merchantId);
        if (active) setStats(s);
      } catch {
        // swallow — endpoint may be unreachable in dev with no Redis env
      }
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [merchantId]);

  const merchant =
    MERCHANTS.find((m) => m.id === merchantId) ?? MERCHANTS[0];

  return (
    <main className="min-h-screen bg-ios-bg p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Merchant Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {merchant.name} · {merchant.category}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-ios-divider bg-card px-3 py-1.5 text-sm"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
            >
              {MERCHANTS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Link
              href="/merchant/rules"
              className="text-sm underline underline-offset-4 hover:opacity-70"
            >
              Edit rules →
            </Link>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Performance
          </h2>
          <StatsGrid stats={stats} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Inventory pulses
          </h2>
          <PulseButtons merchantId={merchantId} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Live feed
          </h2>
          <LiveFeed recentOffers={stats?.recentOffers ?? []} />
        </section>
      </div>
    </main>
  );
}
