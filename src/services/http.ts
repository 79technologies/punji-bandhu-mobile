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
