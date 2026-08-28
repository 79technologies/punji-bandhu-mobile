# 0001 — Blocking blur overlay during price feed connect

**Status:** Proposed
**Date:** 2026-08-27
**Deciders:** 79 Technologies Admin

## Context

Opening the app before a price feed connection was established rendered **₹0.00**
for every holding and for the portfolio total. `app/index.tsx` fell back to zero
for a missing tick (`tick?.ltp ?? 0`), so an absent price was indistinguishable
from a real price of zero. For an audience that historically tracked portfolios
by phoning a broker, a confidently-rendered "₹0.00" total is the worst available
failure mode.

A price cache already existed and was already being written on every tick
(`savePriceCache`), but `loadPriceCache` had no callers anywhere in the codebase.
The last known prices were sitting on the device and nothing read them at boot.

Two further gaps made the connecting state unbounded rather than brief:

- `openSSE` had no connect timeout. `REQUEST_TIMEOUT_MS` covered `fetchEod` and
  `fetchInstruments`, but the SSE `XMLHttpRequest` could hang indefinitely — and a
  black-holed network or a wedged backend is precisely the case that hangs rather
  than erroring.
- `openPriceFeed` never reported failure upward. `onClose` retried silently, so
  the UI had no way to learn that anything was wrong.

The requirement adopted was that cached prices must be visible on open, and that
the app must state plainly that those prices are not yet confirmed — rather than
letting unconfirmed numbers render as though they were live.

This decision breaks **product invariant #4** in `CLAUDE.md` ("No animations that
obscure information") and adds a runtime dependency, both of which require an ADR.

## Decision

**A full-screen blur overlay is rendered whenever `feedStatus === 'connecting'`,
blocking all touch interaction, on every connect including foreground reconnects.**

Specifically:

1. `expo-blur` is added as a runtime dependency. Its degraded Android rendering
   (flat translucent overlay on many devices) is accepted; no fallback is built.
2. The overlay covers the entire screen — app bar, total card, holdings list and
   the Add-stock FAB. No control is tappable beneath it. Adding a holding is a
   local-only operation and is nonetheless blocked for the duration.
3. The overlay paints immediately on entering `connecting`. There is no appearance
   delay and no minimum display time; a sub-second connect will flash it.
4. It is a pure function of feed status. A foreground return during market hours
   re-enters `connecting` and re-blurs, regardless of how briefly the app was away.
5. It clears immediately on `live` or `closed`. On `offline` it persists, with the
   failure card rendered above it; only the card's dismiss action clears it. Where
   no cache exists there is no dismiss action, so the blur persists until a
   connection succeeds.

**Bounding rules that make the above tolerable:**

6. `openSSE` gains an 8s deadline measured to the first *parsed snapshot or tick* —
   not to first byte. A connection that is open but has produced no usable price is
   treated as failed. Cleared on snapshot/tick, `market_closed`, and rotate.
7. A retry button appears at `min(6s elapsed, retry budget exhausted)`. The budget
   is 3 attempts total, spaced `3000 + random(0, 1000)` ms. Exponential backoff is
   **not** used; the random spread exists solely to desynchronise clients after a
   backend restart, and the delay never grows.
8. The retry budget applies only to the error branch. `market_closed` and HTTP 503
   are normal states and continue to schedule a reconnect at the next market open,
   unaffected by the budget.
9. Once the budget is spent, nothing retries automatically. Recovery requires the
   user tapping "Try again" or backgrounding and returning.
10. Where a price cache exists, the failure card offers a secondary action that
    dismisses the blur to a non-blocking banner. **Where no cache exists, it does
    not** — the holdings list is unreachable until connectivity returns.

**Supporting rules adopted at the same time:**

11. Prices are `number | null`. A missing price renders `—`, never `₹0.00`.
12. `loadPriceCache()` is called at boot to hydrate the feed state.
13. The per-row change figure renders only when `feedStatus === 'live'`. Cached and
    EOD prices show no change figure, consistent with the existing EOD `cp: 0`
    behaviour.
14. The cache stores *price* time, not write time. Live ticks store `Date.now()`;
    the EOD path stores the EOD timestamp and now writes to the cache, which it
    previously did not. The stamp renders the real clock hour rather than the
    hardcoded 3:30 PM in `formatEodTs`.
15. Cached prices never expire and receive identical visual treatment at any age.
16. A partial portfolio shows the sum of priced holdings with a caption naming what
    is excluded, rather than a dash or a silent undercount.
17. The EOD path receives the same blur, retry policy and failure card as the SSE
    path, and is folded into `openPriceFeed` so that `feedStatus` has exactly one
    writer. Status remains `connecting` until EOD lands, then becomes `closed`.

This ADR sanctions the connect-state blur **only**. It does not license other
information-obscuring UI, and invariant #4 otherwise stands.

## Consequences

**Easier**

- The ₹0.00 class of bug is structurally impossible: a missing price has its own
  representation and cannot be confused with a real value.
- One connection story covers both market hours and the ~17½ hours a day the market
  is shut, where failures were previously swallowed entirely (`.catch(() => {})`).
- One writer for `feedStatus` removes a class of race between the SSE and EOD paths.
- The connecting state is bounded. It was previously unbounded on a hung backend.

**Harder**

- The portfolio is unreadable and the app unresponsive for up to 6s per connect,
  including quick foreground returns during market hours where the cached numbers
  were still accurate.
- With no cache, an offline user cannot reach their own locally-stored holdings at
  all. This is a deliberate exception to the rule that local data is never gated on
  network state.
- A three-week-old price is visually indistinguishable from yesterday's; only the
  timestamp differs, and reading it requires the user to compare against today.
- Android and iOS ship visibly different blur treatments.
- Connectivity returning after the budget is spent does not heal the app; it waits
  for a tap or a foreground.
- `expo-blur` is a native module, so the app is further from a bare Expo Go flow.

## Alternatives Considered

**Non-blocking inline status line (recommended, rejected).** Numbers stay crisp;
the reconnect is announced by a status line inside the total card, filling in the
`connecting` case that was never rendered. No dependency, no invariant break,
nothing flashes on a fast reconnect. Rejected in favour of a stronger, unambiguous
signal that displayed prices are unconfirmed.

**Delayed dim at 55% opacity, no blur (rejected).** Same signal without a native
dependency and identical across platforms. Rejected for the same reason; also
carried a legibility cost on 16pt body text for the target audience.

**Blur only after a real absence, or on cold start only (rejected).** Would have
suppressed the blur on quick foreground returns where cached prices were still
accurate. Rejected in favour of a rule that is trivially predictable and cannot
disagree with feed state.

**Blur scoped to the data, leaving app bar and FAB live (rejected).** Would have
kept local-only actions — adding a holding, opening About — working during a
reconnect. Rejected in favour of an unambiguous "wait" state.

**Staleness tiering by trading sessions missed (rejected).** Would have escalated
copy from a timestamp to a plain relative age ("These prices are 12 days old") once
one or more sessions had closed since capture, avoiding the trap that age in hours
misreads every Monday morning as stale. Rejected as unnecessary complexity in
favour of a single timestamp at any age.

**Revealing the holdings list when no cache exists (rejected).** Would have let an
offline user confirm their symbols and quantities — local data needing no network —
behind dashes for prices. Rejected because a screen of dashes was judged to look
more broken than the failure card.

**Slow background retry after the budget is spent (rejected).** A 30s silent retry
would have healed the tunnel/lift/patchy-signal case with no user action. Rejected
in favour of a hard cap where every reconnect is user-initiated.

**Exponential backoff with jitter (rejected).** Inside a 3-attempt budget the delays
never reach the range where growth matters, so the concept was not paying for
itself. Full jitter was additionally unsafe here: `random(0, d)` can return near-zero
three times running and spend the whole budget against a backend that was mid-restart.

**Retry-only failure card with no dismiss, where a cache exists (rejected).** Would
have kept the blur until a connection genuinely succeeded. Rejected because an
offline user would never reach their portfolio.

## References

- Related ADRs: none (first)
- Product invariants: `CLAUDE.md` — invariant #4, and #3 (local-only data), which
  item 10 above knowingly qualifies
- Code: `src/services/stream.service.ts`, `src/services/eod.service.ts`,
  `src/storage/prices.storage.ts`, `app/index.tsx`
