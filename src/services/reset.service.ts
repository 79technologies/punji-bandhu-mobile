import { clearHoldings } from '../storage/holdings.storage';
import { clearOnboarded } from '../storage/onboarding.storage';
import { clearPriceCache } from '../storage/prices.storage';
import { clearPin } from '../storage/pin.storage';
import { markLocked } from '../state/lock-session';

// "Forgot PIN" path — see ADR 0002. There is no account and no server, so
// there is nothing to reset the PIN against. The only honest recovery is
// wiping the local data the PIN was protecting and starting fresh.
export async function wipeLocalDataAndPin(): Promise<void> {
  await Promise.all([clearHoldings(), clearPriceCache(), clearOnboarded(), clearPin()]);
  markLocked();
}
