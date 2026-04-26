/**
 * PRIVACY: This classifier runs entirely in the browser.
 * It produces a single intent label. Only that label crosses the wire to the server.
 * Raw GPS coordinates, movement history, and user preferences never leave the device.
 * In production, this would be a quantized SLM (Phi-3 Mini, Gemma 2B) in the secure enclave.
 */

export function classifyIntent(params: {
  tempC: number;
  condition: string;
  hour: number;
  behavioral: string;
}): string {
  // Demo override via localStorage (set by demo controls panel)
  if (typeof window !== 'undefined') {
    const forced = localStorage.getItem('forceIntent');
    if (forced) return forced;
  }

  const { tempC, condition, hour, behavioral } = params;

  if (
    tempC < 14 &&
    ['rain', 'drizzle', 'snow', 'fog'].includes(condition) &&
    behavioral === 'stationary'
  ) {
    return 'warm_drink_seeking';
  }

  if (hour >= 11 && hour < 14 && behavioral !== 'stationary') {
    return 'quick_lunch';
  }

  if (behavioral === 'strolling' && hour >= 13 && hour < 18) {
    return 'window_shopping';
  }

  if (behavioral === 'commuting') {
    return 'commuting';
  }

  return 'unknown';
}
