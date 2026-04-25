import type { ContextState, Trigger, MerchantRule } from '@/lib/types/api';

export function buildMessages(
  ctx: ContextState,
  trigger: Trigger,
  rule: MerchantRule,
): Array<{ role: 'user'; content: string }> {
  const time = new Date(ctx.time.iso);
  const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  const demand = ctx.demand.find(d => d.merchantId === trigger.merchantId);
  const demandLabel =
    demand
      ? `${demand.ratio.toFixed(2)} of weekly avg (${demand.ratio < 0.6 ? 'quiet' : demand.ratio > 1.2 ? 'busy' : 'moderate'})`
      : 'unknown';

  const pulse = ctx.merchantPulse.find(p => p.merchantId === trigger.merchantId);
  const pulseStr = pulse ? `${pulse.kind} (${pulse.label})` : 'none';

  const eventsStr =
    ctx.events.length === 0
      ? 'none'
      : ctx.events
          .slice()
          .sort((a, b) => a.startsInMinutes - b.startsInMinutes)
          .slice(0, 2)
          .map(e => `${e.name} in ${e.startsInMinutes} min`)
          .join(', ');

  const locationStr = ctx.location.neighborhoodId
    ? `${ctx.location.cityKey}, ${ctx.location.neighborhoodId}`
    : ctx.location.cityKey;

  const content = `Context:
- Weather: ${ctx.weather.tempC}°C, ${ctx.weather.condition}, "${ctx.weather.summary}"
- Time: ${ctx.time.dayOfWeek} ${ctx.time.period}, ${hhmm}
- Location: ${locationStr}
- Intent hint: ${ctx.intentHint}
- Behavioral: ${ctx.behavioral}
- Merchant demand: ${demandLabel}
- Merchant pulse: ${pulseStr}
- Events nearby: ${eventsStr}

Merchant rule fired: ${rule.id}
- maxDiscountPct: ${rule.maxDiscountPct}
- validMinutes: ${rule.validMinutes}
- goal: ${rule.goal}

Generate the offer.`;

  return [{ role: 'user', content }];
}
