---
name: api-integration
description: Use when wiring Punji Bandhu to a stock-quote source — fetching live NSE/BSE prices for held symbols and computing portfolio value. There is no backend of our own; we only read public quote data.
---

# Skill: api-integration

Use when fetching live quotes to value the user's portfolio, or when replacing a hardcoded `LAST_PRICES` map in `app/constants/` with a real quote source.

## Trigger phrases
"connect to the quote API", "fetch live prices", "replace hardcoded prices", "wire up NSE quotes", "show real-time portfolio value"

## Hard constraints (read before writing any code)

- **No login, ever.** No auth tokens, no SecureStore, no OAuth, no API keys hardcoded in the JS bundle. If a provider requires a key, route it through a tiny proxy and put the key in EAS Secrets — *but* do not introduce a proxy unless the user has approved it in an ADR.
- **No user data leaves the device.** Send the *symbols* to look up, not who owns them, not how many, not the user. The request payload must be indistinguishable between two users holding the same symbol.
- **No analytics, no telemetry, no crash SDKs that phone home with identifiers.** This is the whole product promise.
- **Read-only.** We never POST holdings, orders, or anything resembling a transaction. The app is a tracker, not a broker.

## Steps

### 1. Pick a quote source

Default to a free public endpoint that returns last-traded price by symbol (e.g. Yahoo Finance `query1.finance.yahoo.com/v7/finance/quote?symbols=...`, or NSE's public quote endpoint). Confirm with the user — provider choice is an ADR (terms-of-use, rate limits, attribution).

### 2. Create a service file

Create `app/services/quotes.service.ts`:

```ts
const BASE_URL = process.env.EXPO_PUBLIC_QUOTE_BASE_URL;

export type Quote = {
  symbol: string;
  lastPrice: number;
  currency: string;
  asOf: string; // ISO timestamp from the provider
};

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const url = `${BASE_URL}/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`fetchQuotes failed: ${res.status}`);
  return normalizeQuoteResponse(await res.json());
}
```

- One file per domain: `quotes.service.ts`, future `symbols.service.ts` (search/autocomplete).
- Never call `fetch` directly inside a component.
- Always check `res.ok` and throw on failure — do not silently swallow HTTP errors.
- Strip cookies and identifying headers; pass only what the provider requires.

### 3. Environment variables

Add to `.env.local` (gitignored):
```
EXPO_PUBLIC_QUOTE_BASE_URL=https://query1.finance.yahoo.com/v7/finance
```

For production via EAS, add as an EAS Secret:
```
eas secret:create --scope project --name EXPO_PUBLIC_QUOTE_BASE_URL --value https://...
```

`EXPO_PUBLIC_` prefix is required for Expo to expose env vars to the JS bundle. Never put a *secret* behind `EXPO_PUBLIC_` — it ships to clients.

### 4. Replace hardcoded prices in components

Pattern for loading quotes in the portfolio screen:

```ts
const [quotes, setQuotes] = useState<Record<string, Quote>>({});
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const symbols = holdings.map(h => h.symbol);
  fetchQuotes(symbols)
    .then(qs => setQuotes(Object.fromEntries(qs.map(q => [q.symbol, q]))))
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
}, [holdings]);
```

- Show `<ActivityIndicator>` while loading; show a plain-English error and a Retry button on failure ("Couldn't reach the market data right now. Tap to try again.").
- Cache the last successful quote response in `AsyncStorage` and display it with a "Last updated at HH:MM" label when offline — better than a blank screen for the audience.

### 5. Refresh strategy

- Pull-to-refresh on the portfolio screen (`RefreshControl`).
- Optional 30-second polling **only while the screen is focused** (`useFocusEffect` + `setInterval`, clear on blur). Do not poll in the background.
- Respect provider rate limits. Batch all symbols into one request, never one fetch per holding.

### 6. Storage of holdings

Holdings themselves are stored in `AsyncStorage` under a single key (e.g. `pb.holdings.v1`). They never leave the device. Use `expo-secure-store` only if the user explicitly asks for an at-rest encryption upgrade — by default `AsyncStorage` is enough because the data is not a secret, just personal.

### 7. Checklist before finishing

- [ ] No hardcoded URLs in component files — all in the service layer.
- [ ] `.env.local` added to `.gitignore`.
- [ ] Loading and error states handled in every screen that fetches data.
- [ ] No auth headers, no cookies, no identifiers attached to the request.
- [ ] No analytics / crash SDK added alongside the API work.
- [ ] Holdings stay in `AsyncStorage`; nothing about *who holds what* is sent over the wire.
- [ ] `npx tsc --noEmit` — zero errors.
- [ ] `npm run lint` — zero warnings.
