const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export type EodPrice = {
  close: number;
  ts: number; // unix ms
};

export async function fetchEod(keys: string[]): Promise<Record<string, EodPrice>> {
  if (keys.length === 0) return {};
  const params = keys.map((k) => `keys=${encodeURIComponent(k)}`).join('&');
  const res = await fetch(`${API_BASE}/feed/eod?${params}`);
  if (!res.ok) throw new Error(`EOD fetch failed: ${res.status}`);
  const json = (await res.json()) as { prices: Record<string, EodPrice> };
  return json.prices ?? {};
}
