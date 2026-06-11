import { isMarketOpen, msUntilNextMarketOpen } from '../utils/market-hours';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export type PriceTick = {
  ltp: number; // last traded price
  cp: number;  // previous day close price
};

export type FeedCallbacks = {
  onSnapshot: (ticks: Record<string, PriceTick>) => void;
  onTick: (ticks: Record<string, PriceTick>) => void;
  onMarketClosed: () => void;
};

type FeedData = {
  feeds: Record<string, { ltpc?: { ltp?: number; cp?: number } }>;
};

function parseTicks(feeds: FeedData['feeds']): Record<string, PriceTick> {
  const ticks: Record<string, PriceTick> = {};
  for (const [key, feed] of Object.entries(feeds)) {
    const ltp = feed.ltpc?.ltp;
    const cp = feed.ltpc?.cp;
    if (typeof ltp === 'number' && typeof cp === 'number') {
      ticks[key] = { ltp, cp };
    }
  }
  return ticks;
}

// React Native's fetch hangs forever on SSE (persistent connection) because it
// waits for the response to close before resolving. XHR's onprogress fires
// incrementally as chunks arrive, which is what SSE requires.
function openSSE(
  url: string,
  signal: AbortSignal,
  onEvent: (eventName: string, data: string) => void,
  onClose: (err?: unknown, status?: number) => void,
): void {
  const xhr = new XMLHttpRequest();
  let buf = '';
  let lastLength = 0;
  let handledClose = false;

  const close = (err?: unknown, status?: number) => {
    if (handledClose) return;
    handledClose = true;
    onClose(err, status);
  };

  xhr.open('GET', url);
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.setRequestHeader('Cache-Control', 'no-cache');

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 2 && xhr.status === 503) {
      xhr.abort();
      close(null, 503);
    }
  };

  xhr.onprogress = () => {
    const newText = xhr.responseText.slice(lastLength);
    lastLength = xhr.responseText.length;
    buf += newText;

    const chunks = buf.split('\n\n');
    buf = chunks.pop() ?? '';

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const lines = chunk.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event: '));
      const dataLine = lines.find((l) => l.startsWith('data: '));
      const eventName = eventLine ? eventLine.slice(7).trim() : 'message';

      if (dataLine) {
        onEvent(eventName, dataLine.slice(6));
      } else if (eventName === 'market_closed') {
        // market_closed may carry no data body
        onEvent(eventName, '');
      }
      // SSE comment lines (": keepalive") are ignored by design
    }
  };

  xhr.onerror = (e) => { close(e); };
  xhr.onloadend = () => { close(undefined, xhr.status); };

  signal.addEventListener('abort', () => { xhr.abort(); });
  xhr.send();
}

/**
 * Opens a live price feed for the given instrument keys.
 * Only connects during NSE market hours (Mon–Fri 09:30–15:30 IST).
 * When closed (initially, via 503, or via market_closed SSE event), schedules
 * a reconnect at the next market open using msUntilNextMarketOpen().
 * Reconnects on network error with exponential backoff (1s → 2s → 4s … cap 30s).
 * Returns a cleanup function that closes the connection and cancels any pending timer.
 */
export function openPriceFeed(
  keys: string[],
  callbacks: FeedCallbacks,
): () => void {
  if (keys.length === 0) return () => {};

  let cancelled = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = 1000;
  let abortCurrent: (() => void) | null = null;

  const url = `${API_BASE}/feed?keys=${encodeURIComponent(keys.join(','))}`;

  const attempt = () => {
    if (cancelled) return;

    // Per-attempt controller so aborting on market_closed doesn't kill future retries
    const ac = new AbortController();
    abortCurrent = () => ac.abort();
    let closedByServer = false;

    openSSE(
      url,
      ac.signal,
      (eventName, data) => {
        if (eventName === 'market_closed') {
          closedByServer = true;
          callbacks.onMarketClosed();
          ac.abort();
          return;
        }
        if (eventName !== 'snapshot' && eventName !== 'tick') return;
        try {
          const msg = JSON.parse(data) as FeedData;
          if (!msg.feeds) return;
          const ticks = parseTicks(msg.feeds);
          if (Object.keys(ticks).length === 0) return;
          backoffMs = 1000;
          if (eventName === 'snapshot') callbacks.onSnapshot(ticks);
          else callbacks.onTick(ticks);
        } catch {
          // Malformed JSON — skip silently
        }
      },
      (err, status) => {
        abortCurrent = null;
        if (err) console.error('[stream] connection error:', err);

        if (closedByServer || status === 503) {
          if (status === 503) callbacks.onMarketClosed();
          if (!cancelled) {
            retryTimer = setTimeout(attempt, msUntilNextMarketOpen());
          }
          return;
        }

        if (!cancelled) {
          const delay = backoffMs;
          backoffMs = Math.min(backoffMs * 2, 30_000);
          retryTimer = setTimeout(attempt, delay);
        }
      },
    );
  };

  if (isMarketOpen()) {
    attempt();
  } else {
    callbacks.onMarketClosed();
    retryTimer = setTimeout(attempt, msUntilNextMarketOpen());
  }

  return () => {
    cancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (abortCurrent) abortCurrent();
  };
}
