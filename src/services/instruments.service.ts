import type { Exchange, Instrument } from "../types/domain";
import {
  loadCachedInstruments,
  saveCachedInstruments,
} from "../storage/instruments.storage";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// djb2 hash — stable, no external deps
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

function computeHash(instruments: Instrument[]): string {
  const sorted = [...instruments].sort((a, b) => a.key.localeCompare(b.key));
  return djb2(JSON.stringify(sorted));
}

function parseExchange(key: string): Exchange {
  return key.startsWith("BSE") ? "BSE" : "NSE";
}

type RawInstrument = { key: string; symbol: string; name: string };

function toInstrument(raw: RawInstrument): Instrument {
  return {
    key: raw.key,
    symbol: raw.symbol,
    name: raw.name,
    exchange: parseExchange(raw.key),
  };
}

/**
 * Fetches the instruments list from the backend.
 *
 * Always calls the API, passing the stored hash as a query param so the server
 * can skip work if nothing changed. On receipt, recomputes the hash locally;
 * if it differs from the stored hash the cache is updated.
 *
 * Falls back to the cached list on network or parse errors.
 */
export async function fetchInstruments(): Promise<Instrument[]> {
  const { instruments: cached, hash: storedHash } =
    await loadCachedInstruments();

  try {
    const url = storedHash
      ? `${API_BASE}/feed/instruments?hash=${storedHash}`
      : `${API_BASE}/feed/instruments`;

    console.log(`[instruments] curl '${url}'`);
    const res = await fetch(url);
    if (!res.ok) return cached;

    const data = (await res.json()) as { instruments?: RawInstrument[] };
    const raw = data.instruments ?? [];

    // Server may return an empty array to indicate "nothing changed"
    if (raw.length === 0) return cached;

    const fresh = raw.map(toInstrument);
    const newHash = computeHash(fresh);

    if (newHash !== storedHash) {
      await saveCachedInstruments(fresh, newHash);
    }

    return fresh;
  } catch {
    return cached;
  }
}

export function searchInstruments(
  instruments: Instrument[],
  query: string,
): Instrument[] {
  const q = query.trim().toUpperCase();
  if (q.length === 0) return instruments;
  return instruments.filter(
    (i) => i.symbol.includes(q) || i.name.toUpperCase().includes(q),
  );
}

export function findInstrument(
  instruments: Instrument[],
  symbol: string,
  exchange?: Exchange,
): Instrument | undefined {
  return instruments.find(
    (i) =>
      i.symbol === symbol &&
      (exchange === undefined || i.exchange === exchange),
  );
}
