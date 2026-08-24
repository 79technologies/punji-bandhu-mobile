import type { Exchange, Instrument, InstrumentStatus } from "../types/domain";
import {
  loadCachedInstruments,
  saveCachedInstruments,
} from "../storage/instruments.storage";
import { REQUEST_TIMEOUT_MS } from "./http";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type RawInstrument = {
  key: string;
  symbol: string;
  name: string;
  status: InstrumentStatus;
};

type InstrumentsResponse = {
  hash: string;
  instruments: RawInstrument[];
};

function parseExchange(key: string): Exchange {
  return key.startsWith("BSE") ? "BSE" : "NSE";
}

function toInstrument(raw: RawInstrument): Instrument {
  return {
    key: raw.key,
    symbol: raw.symbol,
    name: raw.name,
    exchange: parseExchange(raw.key),
    status: raw.status,
  };
}

export async function fetchInstruments(): Promise<Instrument[]> {
  console.log(`[instruments] fetchInstruments: start — API_BASE=${API_BASE ?? 'UNDEFINED'}`);

  if (!API_BASE) {
    console.error('[instruments] fetchInstruments: EXPO_PUBLIC_API_BASE_URL is not set — cannot fetch');
    return [];
  }

  const { instruments: cached, hash } = await loadCachedInstruments();

  const url = hash
    ? `${API_BASE}/feed/instruments?hash=${encodeURIComponent(hash)}`
    : `${API_BASE}/feed/instruments`;

  console.log(`[instruments] fetchInstruments: fetching ${url}`);

  // Timer stays armed across the body read — see REQUEST_TIMEOUT_MS.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: ac.signal });
    } catch (err) {
      console.error('[instruments] fetchInstruments: network error (fetch threw):', err);
      console.log(`[instruments] fetchInstruments: returning ${cached.length} cached instruments`);
      return cached;
    }

    console.log(`[instruments] fetchInstruments: response status=${response.status}`);

    if (response.status === 304) {
      console.log(`[instruments] fetchInstruments: 304 Not Modified — returning ${cached.length} cached instruments`);
      return cached;
    }

    if (response.status === 200) {
      let body: InstrumentsResponse;
      try {
        body = (await response.json()) as InstrumentsResponse;
      } catch (err) {
        console.error('[instruments] fetchInstruments: failed to parse JSON body:', err);
        return cached;
      }
      console.log(`[instruments] fetchInstruments: 200 OK — received ${body.instruments?.length ?? 'undefined'} instruments, hash=${body.hash}`);

      // A 200 with a malformed body would otherwise throw on .map() and escape
      // past the caller's fallback, emptying the list instead of keeping the cache.
      if (!Array.isArray(body.instruments) || typeof body.hash !== 'string') {
        console.error(`[instruments] fetchInstruments: malformed 200 body — falling back to ${cached.length} cached instruments`);
        return cached;
      }

      const instruments = body.instruments.map(toInstrument);
      await saveCachedInstruments(instruments, body.hash);
      console.log(`[instruments] fetchInstruments: done — returning ${instruments.length} instruments`);
      return instruments;
    }

    console.error(`[instruments] fetchInstruments: unexpected status ${response.status} — falling back to ${cached.length} cached instruments`);
    return cached;
  } finally {
    clearTimeout(timer);
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
