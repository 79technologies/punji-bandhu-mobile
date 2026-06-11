// IST = UTC+5:30. All market-hours logic is expressed in IST wall time.
// NSE trading session: 09:15–15:30 IST, Monday–Friday.
// No public-holiday calendar — the backend emits market_closed when the
// exchange is actually closed, so the client-side check is only used to
// avoid a pointless connection attempt on app foreground.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDate(now: Date): Date {
  // Shift the epoch so that getUTC* calls return IST values
  return new Date(now.getTime() + IST_OFFSET_MS);
}

export function isMarketOpen(now: Date = new Date()): boolean {
  const ist = istDate(now);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hhmm = ist.getUTCHours() * 100 + ist.getUTCMinutes();
  return hhmm >= 915 && hhmm <= 1530;
}

/** Milliseconds until the next NSE market open from `now`. */
export function msUntilNextMarketOpen(now: Date = new Date()): number {
  const ist = istDate(now);
  const day = ist.getUTCDay();
  const hhmm = ist.getUTCHours() * 100 + ist.getUTCMinutes();

  // Today is a weekday and we haven't reached open yet
  if (day >= 1 && day <= 5 && hhmm < 915) {
    const todayOpen = new Date(ist);
    todayOpen.setUTCHours(9, 15, 0, 0);
    return todayOpen.getTime() - IST_OFFSET_MS - now.getTime();
  }

  // How many days forward to reach the next market open day
  let daysToAdd: number;
  if (day === 5) daysToAdd = 3;      // Friday after close → Monday
  else if (day === 6) daysToAdd = 2; // Saturday → Monday
  else if (day === 0) daysToAdd = 1; // Sunday → Monday
  else daysToAdd = 1;                // Mon–Thu after close → next day

  const nextOpen = new Date(ist);
  nextOpen.setUTCDate(nextOpen.getUTCDate() + daysToAdd);
  nextOpen.setUTCHours(9, 30, 0, 0);
  return nextOpen.getTime() - IST_OFFSET_MS - now.getTime();
}
