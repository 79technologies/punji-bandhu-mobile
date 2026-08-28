/**
 * Shared HTTP settings for the quote services.
 *
 * AbortSignal.timeout() is not reliably present in React Native's AbortController
 * polyfill, so callers drive a plain AbortController with a manual timer instead.
 *
 * The timer must stay armed until the response *body* has been read. Clearing it
 * the moment headers arrive still leaves a stalled body read hanging forever,
 * which is the failure this exists to prevent.
 */

// Generous rather than snappy: the instruments payload is a few hundred KB and
// this audience is often on poor mobile connections. It is an upper bound on a
// hang, not a target latency.
export const REQUEST_TIMEOUT_MS = 15_000;

// EOD returns a handful of closes for held keys only, so it does not need the
// allowance the instruments payload does. Matched to the feed's snapshot deadline
// so both transports fail at the same pace — see ADR 0001.
export const EOD_TIMEOUT_MS = 8_000;
