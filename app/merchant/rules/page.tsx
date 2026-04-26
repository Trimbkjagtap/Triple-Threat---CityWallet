"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMerchantRules, postMerchantRule } from "@/lib/api-client";
import type {
  DayOfWeek,
  MerchantRule,
  RuleCondition,
  WeatherCondition,
} from "@/lib/types/api";

// Mirrored from app/merchant/page.tsx — keep these lists aligned.
const MERCHANTS = [
  { id: "m_cafe_mueller", name: "Café Müller" },
  { id: "m_baeckerei_schmidt", name: "Bäckerei Schmidt" },
  { id: "m_buchladen_wittwer", name: "Buchladen Wittwer" },
  { id: "m_weinbar_schiller", name: "Weinbar Schiller" },
  { id: "m_eis_genuss", name: "Eis & Genuss" },
];

const WEATHER_OPTIONS: WeatherCondition[] = [
  "rain",
  "snow",
  "drizzle",
  "clear",
  "cloud",
  "fog",
];

const DAY_OPTIONS: DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

const PULSE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fresh_batch", label: "Fresh batch" },
  { value: "just_baked", label: "Just baked" },
  { value: "limited_stock", label: "Limited stock" },
  { value: "end_of_shift", label: "End of shift" },
] as const;

type PulseValue = (typeof PULSE_OPTIONS)[number]["value"];

type FormState = {
  id: string;
  goal: string;
  maxDiscountPct: number;
  validMinutes: number;
  weather: WeatherCondition[];
  tempLt: string;
  demandLt: string;
  days: DayOfWeek[];
  hourGte: string;
  hourLt: string;
  pulse: PulseValue;
  inZone: string;
};

const EMPTY_FORM: FormState = {
  id: "",
  goal: "",
  maxDiscountPct: 20,
  validMinutes: 30,
  weather: [],
  tempLt: "",
  demandLt: "",
  days: [],
  hourGte: "",
  hourLt: "",
  pulse: "none",
  inZone: "",
};

// Translate the editor form into the strict union RuleCondition[] shape the
// server validates against. Empty values are skipped so the saved rule only
// contains predicates the merchant actually set.
function buildConditions(form: FormState): RuleCondition[] {
  const conditions: RuleCondition[] = [];
  if (form.weather.length > 0) {
    conditions.push({ "weather.condition": form.weather });
  }
  const tempLt = Number(form.tempLt);
  if (form.tempLt !== "" && !Number.isNaN(tempLt)) {
    conditions.push({ "weather.tempC": { lt: tempLt } });
  }
  const demandLt = Number(form.demandLt);
  if (form.demandLt !== "" && !Number.isNaN(demandLt)) {
    conditions.push({ "demand.self": { lt: demandLt } });
  }
  if (form.days.length > 0) {
    conditions.push({ "time.dayOfWeek": form.days });
  }
  const hourGte = Number(form.hourGte);
  const hourLt = Number(form.hourLt);
  const hour: { gte?: number; lt?: number } = {};
  if (form.hourGte !== "" && !Number.isNaN(hourGte)) hour.gte = hourGte;
  if (form.hourLt !== "" && !Number.isNaN(hourLt)) hour.lt = hourLt;
  if (Object.keys(hour).length > 0) {
    conditions.push({ "time.hour": hour });
  }
  if (form.pulse !== "none") {
    // The union keys are literal strings — index by computed key with a
    // narrow assertion rather than a switch ladder.
    const key = `pulse.${form.pulse}` as
      | "pulse.fresh_batch"
      | "pulse.just_baked"
      | "pulse.limited_stock"
      | "pulse.end_of_shift";
    conditions.push({ [key]: true } as RuleCondition);
  }
  if (form.inZone.trim() !== "") {
    conditions.push({ "location.inZone": form.inZone.trim() });
  }
  return conditions;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function MerchantRulesPage() {
  const [merchantId, setMerchantId] = useState(MERCHANTS[0].id);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showConditions, setShowConditions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async (id: string) => {
    try {
      const next = await getMerchantRules(id);
      setRules(next);
    } catch {
      // swallow — Redis may be unconfigured locally
      setRules([]);
    }
  };

  useEffect(() => {
    fetchRules(merchantId);
  }, [merchantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.goal.trim()) {
      toast.error("Rule ID and goal are required");
      return;
    }
    setSubmitting(true);
    try {
      const rule: MerchantRule = {
        id: form.id.trim(),
        merchantId,
        goal: form.goal.trim(),
        maxDiscountPct: form.maxDiscountPct,
        validMinutes: form.validMinutes,
        when: buildConditions(form),
      };
      await postMerchantRule(rule);
      toast.success("Rule saved", { description: rule.id });
      setForm(EMPTY_FORM);
      await fetchRules(merchantId);
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const merchant = MERCHANTS.find((m) => m.id === merchantId) ?? MERCHANTS[0];

  return (
    <main className="min-h-screen bg-ios-bg p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Rule Editor</h1>
            <p className="text-sm text-muted-foreground">{merchant.name}</p>
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
              href="/merchant"
              className="text-sm underline underline-offset-4 hover:opacity-70"
            >
              ← Back
            </Link>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Current rules ({rules.length})
          </h2>
          {rules.length === 0 ? (
            <Card>
              <CardContent className="px-4 py-3 text-sm text-muted-foreground">
                No saved rules yet. Create one below.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <Card key={`${r.id}-${r.merchantId}`}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {r.id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.goal}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        max {r.maxDiscountPct}%
                      </Badge>
                      <Badge variant="secondary">
                        {r.validMinutes} min
                      </Badge>
                      <Badge variant="outline">
                        {r.when.length} condition{r.when.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create rule</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="rule-id">Rule ID</Label>
                    <Input
                      id="rule-id"
                      value={form.id}
                      onChange={(e) =>
                        setForm({ ...form, id: e.target.value })
                      }
                      placeholder="rain_quiet_warmup"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rule-goal">Goal</Label>
                    <Input
                      id="rule-goal"
                      value={form.goal}
                      onChange={(e) =>
                        setForm({ ...form, goal: e.target.value })
                      }
                      placeholder="fill quiet hours"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rule-discount">Max discount %</Label>
                    <Input
                      id="rule-discount"
                      type="number"
                      min={0}
                      max={50}
                      value={form.maxDiscountPct}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxDiscountPct: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rule-valid">Valid minutes</Label>
                    <Input
                      id="rule-valid"
                      type="number"
                      min={1}
                      max={1440}
                      value={form.validMinutes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          validMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="border-t border-ios-divider pt-3">
                  <button
                    type="button"
                    onClick={() => setShowConditions((v) => !v)}
                    className="text-sm font-medium underline underline-offset-4 hover:opacity-70"
                  >
                    {showConditions ? "Hide" : "Show"} conditions (optional)
                  </button>
                </div>

                {showConditions && (
                  <div className="space-y-4 rounded-lg border border-ios-divider bg-card p-3">
                    <div className="space-y-2">
                      <Label>Weather condition</Label>
                      <div className="flex flex-wrap gap-2">
                        {WEATHER_OPTIONS.map((w) => {
                          const checked = form.weather.includes(w);
                          return (
                            <label
                              key={w}
                              className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs ${
                                checked
                                  ? "border-foreground bg-foreground/5"
                                  : "border-ios-divider bg-card"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    weather: toggle(form.weather, w),
                                  })
                                }
                              />
                              {w}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="temp-lt">Temperature less than (°C)</Label>
                        <Input
                          id="temp-lt"
                          type="number"
                          value={form.tempLt}
                          onChange={(e) =>
                            setForm({ ...form, tempLt: e.target.value })
                          }
                          placeholder="10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="demand-lt">Demand below ratio</Label>
                        <Input
                          id="demand-lt"
                          type="number"
                          step="0.05"
                          min={0}
                          max={1}
                          value={form.demandLt}
                          onChange={(e) =>
                            setForm({ ...form, demandLt: e.target.value })
                          }
                          placeholder="0.4"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Day of week</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAY_OPTIONS.map((d) => {
                          const checked = form.days.includes(d);
                          return (
                            <label
                              key={d}
                              className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs ${
                                checked
                                  ? "border-foreground bg-foreground/5"
                                  : "border-ios-divider bg-card"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    days: toggle(form.days, d),
                                  })
                                }
                              />
                              {d}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="hour-gte">Hour gte</Label>
                        <Input
                          id="hour-gte"
                          type="number"
                          min={0}
                          max={23}
                          value={form.hourGte}
                          onChange={(e) =>
                            setForm({ ...form, hourGte: e.target.value })
                          }
                          placeholder="9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hour-lt">Hour lt</Label>
                        <Input
                          id="hour-lt"
                          type="number"
                          min={0}
                          max={24}
                          value={form.hourLt}
                          onChange={(e) =>
                            setForm({ ...form, hourLt: e.target.value })
                          }
                          placeholder="11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="pulse">Pulse kind</Label>
                        <select
                          id="pulse"
                          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                          value={form.pulse}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              pulse: e.target.value as PulseValue,
                            })
                          }
                        >
                          {PULSE_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="zone">Inside zone</Label>
                        <Input
                          id="zone"
                          value={form.inZone}
                          onChange={(e) =>
                            setForm({ ...form, inZone: e.target.value })
                          }
                          placeholder="altstadt"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving…" : "Save rule"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
