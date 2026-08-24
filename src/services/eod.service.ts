import { REQUEST_TIMEOUT_MS } from './http';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export type EodPrice = {
  close: number;
  ts: number; // unix ms
};

export async function fetchEod(keys: string[]): Promise<Record<string, EodPrice>> {
  if (keys.length === 0) return {};
  const params = keys.map((k) => `keys=${encodeURIComponent(k)}`).join('&');

  // Timer stays armed across the body read — see REQUEST_TIMEOUT_MS.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/feed/eod?${params}`, { signal: ac.signal });
    if (!res.ok) throw new Error(`EOD fetch failed: ${res.status}`);
    const json = (await res.json()) as { prices: Record<string, EodPrice> };
    return json.prices ?? {};
  } finally {
    clearTimeout(timer);
  }
}
