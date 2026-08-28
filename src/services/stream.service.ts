import { isMarketOpen, msUntilNextMarketOpen } from '../utils/market-hours';
import { fetchEod } from './eod.service';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export type PriceTick = {
  ltp: number; // last traded price
  cp: number;  // previous day close price
};

/**
 * connecting — no usable price yet this cycle; the UI blurs on this.
 * live       — an SSE snapshot/tick has landed.
 * closed     — market is shut and EOD closes are on screen.
 * offline    — gave up, or took long enough that the user needs a way out.
 *              Retries do NOT resume from here; only retry() or a remount does.
 */
export type FeedStatus = 'connecting' | 'live' | 'closed' | 'offline';

export type FeedCallbacks = {
  onSnapshot: (ticks: Record<string, PriceTick>) => void;
  onTick: (ticks: Record<string, PriceTick>) => void;
  onEodPrices: (ticks: Record<string, PriceTick>, pricedAt: number | null) => void;
  onStatus: (status: FeedStatus) => void;
};

export type PriceFeed = {
  close: () => void;
  /** User-initiated. Resets the attempt budget and re-enters `connecting`. */
  retry: () => void;
};

type FeedData = {
  feeds: Record<string, { ltpc?: { ltp?: number; cp?: number } }>;
};

// A connection that is open but has produced no usable price is, from the user's
// side, indistinguishable from no connection — so the deadline is measured to the
// first parsed snapshot/tick, not to first byte. RN's XHR will otherwise sit on a
// black-holed network or a wedged backend until the platform TCP timeout.
const SNAPSHOT_DEADLINE_MS = 8_000;

// Fixed, not exponential: inside a 3-attempt budget the delays never reach the
// range where growth would matter. The random spread is not backoff — it exists so
// that a backend restart doesn't bring every client back in the same instant, which
// with SSE means a synchronised storm of held sockets. See ADR 0001.
const RETRY_DELAY_MS = 3_000;
const RETRY_SPREAD_MS = 1_000;
const MAX_ATTEMPTS = 3;

// Upper bound on how long the user stares at a blurred screen before being handed
// a way out. Retries continue underneath; this only moves the UI on.
const OFFLINE_AFTER_MS = 6_000;

// XMLHttpRequest keeps the whole response body in responseText for the lifetime of
// the connection and never truncates it. On a feed held open for a full trading
// session that grows without bound, and each onprogress slice walks a longer string,
// so cost rises as the day goes on. Recycling the connection drops the buffer.
// 15 min trades a sub-second reconnect gap (the server replays a snapshot on
// connect) for bounded memory.
const ROTATE_MS = 15 * 60 * 1000;

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
 * Opens a live price feed for the given instrument keys, falling back to EOD
 * closes whenever the market is shut.
 *
 * Owns the whole price lifecycle so that `FeedStatus` has exactly one writer:
 * SSE during NSE market hours (Mon–Fri 09:15–15:30 IST), EOD otherwise, plus the
 * retry policy and the connecting/offline transitions for both.
 *
 * Failures get MAX_ATTEMPTS tries spaced RETRY_DELAY_MS (+ spread), after which
 * nothing retries automatically — recovery is retry() or a remount. Market
 * closure is not a failure: it costs no attempts and still schedules a reconnect
 * at the next market open. The live connection is recycled every ROTATE_MS to
 * bound memory growth, which likewise costs no attempts.
 */
export function openPriceFeed(
  keys: string[],
  callbacks: FeedCallbacks,
): PriceFeed {
  if (keys.length === 0) {
    return { close: () => {}, retry: () => {} };
  }

  let cancelled = false;
  let attempts = 0;
  let status: FeedStatus | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let offlineTimer: ReturnType<typeof setTimeout> | null = null;
  let abortCurrent: (() => void) | null = null;

  const url = `${API_BASE}/feed?keys=${encodeURIComponent(keys.join(','))}`;

  const setStatus = (next: FeedStatus) => {
    if (cancelled || status === next) return;
    status = next;
    callbacks.onStatus(next);
  };

  const clearOfflineTimer = () => {
    if (offlineTimer) {
      clearTimeout(offlineTimer);
      offlineTimer = null;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  // A usable price landed: the cycle is over, whatever it cost to get here.
  const succeed = (next: 'live' | 'closed') => {
    attempts = 0;
    clearOfflineTimer();
    setStatus(next);
  };

  const failAttempt = () => {
    if (cancelled) return;
    attempts += 1;
    if (attempts >= MAX_ATTEMPTS) {
      clearOfflineTimer();
      setStatus('offline');
      return;
    }
    clearRetryTimer();
    retryTimer = setTimeout(attempt, RETRY_DELAY_MS + Math.random() * RETRY_SPREAD_MS);
  };

  const attemptEod = () => {
    fetchEod(keys)
      .then((prices) => {
        if (cancelled) return;
        const ticks: Record<string, PriceTick> = {};
        let latestTs: number | null = null;
        for (const [key, p] of Object.entries(prices)) {
          // cp=0 hides the change row — there's no intraday change in EOD
          ticks[key] = { ltp: p.close, cp: 0 };
          if (latestTs === null || p.ts > latestTs) latestTs = p.ts;
        }
        succeed('closed');
        callbacks.onEodPrices(ticks, latestTs);
        clearRetryTimer();
        retryTimer = setTimeout(startCycle, msUntilNextMarketOpen());
      })
      .catch(() => { failAttempt(); });
  };

  const attemptSse = () => {
    // Per-attempt controller so aborting on market_closed doesn't kill future retries
    const ac = new AbortController();
    let closedByServer = false;
    let rotating = false;
    let gotData = false;

    const rotateTimer = setTimeout(() => {
      rotating = true;
      ac.abort();
    }, ROTATE_MS);

    // Aborting routes into onClose with status 0, which lands in the failure
    // branch below — the same path a network error takes.
    const deadline = setTimeout(() => {
      if (!gotData) ac.abort();
    }, SNAPSHOT_DEADLINE_MS);

    const clearAttemptTimers = () => {
      clearTimeout(rotateTimer);
      clearTimeout(deadline);
    };

    abortCurrent = () => {
      clearAttemptTimers();
      ac.abort();
    };

    openSSE(
      url,
      ac.signal,
      (eventName, data) => {
        if (eventName === 'market_closed') {
          closedByServer = true;
          clearAttemptTimers();
          ac.abort();
          return;
        }
        if (eventName !== 'snapshot' && eventName !== 'tick') return;
        try {
          const msg = JSON.parse(data) as FeedData;
          if (!msg.feeds) return;
          const ticks = parseTicks(msg.feeds);
          if (Object.keys(ticks).length === 0) return;
          gotData = true;
          clearTimeout(deadline);
          succeed('live');
          if (eventName === 'snapshot') callbacks.onSnapshot(ticks);
          else callbacks.onTick(ticks);
        } catch {
          // Malformed JSON — skip silently
        }
      },
      (err, httpStatus) => {
        clearAttemptTimers();
        abortCurrent = null;
        if (cancelled) return;

        // Deliberate recycle, not a failure: reconnect at once, no delay, no log,
        // and no cost to the attempt budget.
        if (rotating) {
          clearRetryTimer();
          retryTimer = setTimeout(attempt, 0);
          return;
        }

        // Market closure is a normal state, not a failure. Fall through to EOD and
        // keep the budget intact.
        if (closedByServer || httpStatus === 503) {
          attemptEod();
          return;
        }

        if (err) console.error('[stream] connection error:', err);
        failAttempt();
      },
    );
  };

  function attempt() {
    if (cancelled) return;
    if (isMarketOpen()) attemptSse();
    else attemptEod();
  }

  function startCycle() {
    if (cancelled) return;
    clearRetryTimer();
    clearOfflineTimer();
    if (abortCurrent) abortCurrent();
    attempts = 0;
    setStatus('connecting');
    // Moves the UI on even while attempts are still in flight, so a hung backend
    // can't hold the blur for the full budget.
    offlineTimer = setTimeout(() => {
      offlineTimer = null;
      setStatus('offline');
    }, OFFLINE_AFTER_MS);
    attempt();
  }

  startCycle();

  return {
    close: () => {
      cancelled = true;
      clearRetryTimer();
      clearOfflineTimer();
      if (abortCurrent) abortCurrent();
    },
    retry: () => {
      if (cancelled) return;
      startCycle();
    },
  };
}
