"use client";

import type { BehavioralSignal, IntentHint } from "@/lib/types/api";

type ViewState = "idle" | "notified" | "viewing" | "redeeming";

const RULES: Array<{ id: string; label: string }> = [
  { id: "rain_quiet_warmup", label: "rain_quiet_warmup (café)" },
  { id: "fresh_batch_drop", label: "fresh_batch_drop (café)" },
  { id: "morning_pastry_push", label: "morning_pastry_push (bakery)" },
  { id: "pre_show_evening", label: "pre_show_evening (wine bar)" },
  { id: "rainy_browse_invite", label: "rainy_browse_invite (bookshop)" },
];

const BEHAVIORALS: BehavioralSignal[] = [
  "stationary",
  "strolling",
  "commuting",
  "unknown",
];

const INTENTS: IntentHint[] = [
  "warm_drink_seeking",
  "quick_lunch",
  "window_shopping",
  "commuting",
  "unknown",
];

const MERCHANTS = [
  { id: "m_cafe_mueller", name: "Café Müller" },
  { id: "m_baeckerei_schmidt", name: "Bäckerei Schmidt" },
  { id: "m_buchladen_wittwer", name: "Buchladen Wittwer" },
  { id: "m_weinbar_schiller", name: "Weinbar Schiller" },
  { id: "m_eis_genuss", name: "Eis & Genuss" },
];

const CHANNELS: Array<{ key: ViewState; label: string }> = [
  { key: "idle", label: "Idle" },
  { key: "notified", label: "Push" },
  { key: "viewing", label: "Card" },
  { key: "redeeming", label: "Redeem" },
];

type Props = {
  behavioral: BehavioralSignal;
  setBehavioral: (b: BehavioralSignal) => void;
  intentHint: IntentHint;
  setIntentHint: (h: IntentHint) => void;
  forceInZone: boolean;
  setForceInZone: (b: boolean) => void;
  demoForceRule: string | null;
  setDemoForceRule: (r: string | null) => void;
  demoQuiet: string | null;
  setDemoQuiet: (m: string | null) => void;
  view: ViewState;
  setView: (v: ViewState) => void;
  hasOffer: boolean;
  onReset: () => void;
};

export function DemoControlsPanel(props: Props) {
  return (
    <details className="w-full max-w-3xl rounded-xl border border-ios-divider bg-card p-4 text-sm">
      <summary className="cursor-pointer select-none font-semibold">
        Demo controls{" "}
        <span className="text-xs font-normal text-muted-foreground">
          (dev-only, click to expand)
        </span>
      </summary>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Force trigger */}
        <Section label="Force trigger">
          <div className="flex flex-wrap gap-1.5">
            {RULES.map((r) => (
              <Pill
                key={r.id}
                active={props.demoForceRule === r.id}
                onClick={() =>
                  props.setDemoForceRule(
                    props.demoForceRule === r.id ? null : r.id,
                  )
                }
              >
                {r.label}
              </Pill>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Backend honors only when DEMO_MODE=true. Click again to clear.
          </p>
        </Section>

        {/* Behavioral signal */}
        <Section label="Behavioral signal">
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIORALS.map((b) => (
              <Pill
                key={b}
                active={props.behavioral === b}
                onClick={() => props.setBehavioral(b)}
              >
                {b}
              </Pill>
            ))}
          </div>
        </Section>

        {/* Intent hint */}
        <Section label="Intent hint">
          <div className="flex flex-wrap gap-1.5">
            {INTENTS.map((h) => (
              <Pill
                key={h}
                active={props.intentHint === h}
                onClick={() => props.setIntentHint(h)}
              >
                {h.replace(/_/g, " ")}
              </Pill>
            ))}
          </div>
        </Section>

        {/* Force quiet */}
        <Section label="Force quiet (demand ratio = 0.42)">
          <div className="flex flex-wrap gap-1.5">
            {MERCHANTS.map((m) => (
              <Pill
                key={m.id}
                active={props.demoQuiet === m.id}
                onClick={() =>
                  props.setDemoQuiet(props.demoQuiet === m.id ? null : m.id)
                }
              >
                {m.name}
              </Pill>
            ))}
          </div>
        </Section>

        {/* Geofence */}
        <Section label="Geofence">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={props.forceInZone}
              onChange={(e) => props.setForceInZone(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Inside Altstadt polygon</span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            Off → user is at 48.79, 9.21 (outside polygon)
          </p>
        </Section>

        {/* Channel preview */}
        <Section label="Channel preview">
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <Pill
                key={c.key}
                active={props.view === c.key}
                onClick={() => props.setView(c.key)}
                disabled={c.key !== "idle" && !props.hasOffer}
              >
                {c.label}
              </Pill>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Forces the phone to a specific view. Requires an active offer for
            non-idle states.
          </p>
        </Section>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={props.onReset}
          className="rounded-md border border-ios-divider px-3 py-1.5 text-xs font-medium hover:bg-ios-muted"
        >
          Reset all overrides
        </button>
      </div>
    </details>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-30 ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-ios-divider bg-card hover:bg-ios-muted"
      }`}
    >
      {children}
    </button>
  );
}
