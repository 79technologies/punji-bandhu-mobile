// Timestamps shown to the user are always IST wall time — this audience is in
// India and a localised clock would only introduce doubt about which market close
// a price belongs to.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Formats when a price is from, e.g. "26 Aug, 3:30 PM".
 *
 * Renders the real hour. The previous helper hardcoded 3:30 PM because it only
 * ever saw EOD closes; the price cache also holds mid-session ticks, and stamping
 * an 11:47 AM price as 3:30 PM states a time that never happened. See ADR 0001.
 */
export function formatPriceTs(ts: number): string {
  // Shift the epoch so that getUTC* calls return IST values
  const d = new Date(ts + IST_OFFSET_MS);
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const minutes = d.getUTCMinutes();
  const rawHours = d.getUTCHours();
  const suffix = rawHours >= 12 ? 'PM' : 'AM';
  const hours = rawHours % 12 || 12;
  return `${day} ${month}, ${hours}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
