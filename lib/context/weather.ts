import { getOrFetch } from '@/lib/cache/redis';
import { k } from '@/lib/cache/keys';
import { loadCity } from '@/lib/config/loader';
import type { ContextState, WeatherCondition } from '@/lib/types/api';

type Weather = ContextState['weather'];

/**
 * OpenWeatherMap "current weather" call by lat/lng.
 * Cached 10 min fresh, 60 min stale via getOrFetch.
 *
 * Returns a sensible default when OPENWEATHER_API_KEY is missing,
 * so local dev without keys still produces a valid ContextState.
 */
export async function getWeather(cityKey: string): Promise<Weather> {
  return getOrFetch<Weather>(
    k.weather(cityKey),
    async () => fetchWeather(cityKey),
    /* freshSec */ 600,
    /* staleSec */ 3000,
  );
}

async function fetchWeather(cityKey: string): Promise<Weather> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return defaultWeather();

  const city = await loadCity(cityKey);
  const { lat, lng } = city.center;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      console.warn(`[weather] ${cityKey} → ${res.status}`);
      return defaultWeather();
    }
    const json = (await res.json()) as OwmResponse;
    return {
      tempC: Math.round(json.main.temp * 10) / 10,
      condition: mapCondition(json.weather[0]?.main),
      summary: json.weather[0]?.description ?? 'unknown',
    };
  } catch (err) {
    console.warn(`[weather] fetch failed for ${cityKey}:`, err);
    return defaultWeather();
  }
}

function defaultWeather(): Weather {
  return { tempC: 12, condition: 'cloud', summary: 'partly cloudy' };
}

function mapCondition(owm: string | undefined): WeatherCondition {
  switch (owm) {
    case 'Clear':
      return 'clear';
    case 'Rain':
    case 'Thunderstorm':
      return 'rain';
    case 'Snow':
      return 'snow';
    case 'Drizzle':
      return 'drizzle';
    case 'Mist':
    case 'Fog':
    case 'Haze':
    case 'Smoke':
    case 'Dust':
    case 'Sand':
    case 'Ash':
      return 'fog';
    case 'Clouds':
    default:
      return 'cloud';
  }
}

type OwmResponse = {
  main: { temp: number };
  weather: Array<{ main: string; description: string }>;
};
