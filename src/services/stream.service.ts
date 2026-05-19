const API_BASE = "https://punji-bandhu.79technologies.com";

export type PriceTick = {
  ltp: number; // last traded price
  cp: number; // previous day close price
};

type FeedMessage = {
  type: string;
  feeds: Record<string, { ltpc?: { ltp?: number; cp?: number } }>;
};

// React Native's fetch hangs forever on SSE (persistent connection) because it
// waits for the response to close before resolving. XHR's onprogress fires
// incrementally as chunks arrive, which is what SSE requires.
function openSSE(
  url: string,
  signal: AbortSignal,
  onTick: (ticks: Record<string, PriceTick>) => void,
  onClose: (err?: unknown) => void,
): void {
  const xhr = new XMLHttpRequest();
  let buf = "";
  let lastLength = 0;

  xhr.open("GET", url);
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 2) {
      console.log(`[stream] response status=${xhr.status}`);
    }
  };

  xhr.onprogress = () => {
    const newText = xhr.responseText.slice(lastLength);
    lastLength = xhr.responseText.length;
    console.log(`[stream] onprogress chunk:`, JSON.stringify(newText));
    buf += newText;

    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";

    for (const chunk of chunks) {
      // SSE events may contain multiple fields (event:, data:, id:, etc.)
      // Find the data line within the chunk rather than matching the whole block.
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      try {
        const msg = JSON.parse(dataLine.slice(6)) as FeedMessage;
        console.log(`[stream] parsed type=${msg.type} feed keys=`, Object.keys(msg.feeds ?? {}));
        if (msg.type !== "live_feed" || !msg.feeds) continue;
        const ticks: Record<string, PriceTick> = {};
        for (const [key, feed] of Object.entries(msg.feeds)) {
          const ltp = feed.ltpc?.ltp;
          const cp = feed.ltpc?.cp;
          if (typeof ltp === "number" && typeof cp === "number") {
            ticks[key] = { ltp, cp };
          }
        }
        if (Object.keys(ticks).length > 0) {
          console.log(`[stream] dispatching ticks:`, ticks);
          onTick(ticks);
        }
      } catch (e) {
        console.log(`[stream] parse error:`, e, JSON.stringify(dataLine));
      }
    }
  };

  xhr.onerror = (e) => {
    console.log(`[stream] xhr onerror:`, e);
    onClose(e);
  };

  xhr.onloadend = () => {
    console.log(`[stream] xhr onloadend status=${xhr.status}`);
    onClose();
  };

  signal.addEventListener("abort", () => {
    console.log(`[stream] aborting xhr`);
    xhr.abort();
  });

  console.log(`[stream] xhr.send()`);
  xhr.send();
}

/**
 * Opens a live price feed for the given instrument keys.
 * Automatically reconnects on drop (3 s back-off).
 * Returns a cleanup function that closes the connection.
 */
export function openPriceFeed(
  keys: string[],
  onTick: (ticks: Record<string, PriceTick>) => void,
): () => void {
  if (keys.length === 0) return () => {};

  const controller = new AbortController();
  let cancelled = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const url =
    // `${API_BASE}/feed?${keys.map((k) => `keys=${encodeURIComponent(k)}`).join('&')}`;
    `${API_BASE}/feed?keys=${encodeURIComponent(keys.join(","))}`;

  const attempt = () => {
    console.log(`[stream] curl -N -H 'Accept: text/event-stream' '${url}'`);
    openSSE(url, controller.signal, onTick, (err) => {
      if (err) console.log(`[stream] connection error:`, err);
      if (!cancelled) {
        console.log(`[stream] retrying in 3s`);
        retryTimer = setTimeout(attempt, 3000);
      }
    });
  };

  attempt();

  return () => {
    cancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    controller.abort();
  };
}
