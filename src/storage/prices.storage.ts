import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PriceTick } from '../services/stream.service';

const KEY = 'pb.prices.v1';

export type PriceCache = {
  prices: Record<string, PriceTick>;
  // When the *prices* are from, not when this file was written. Live ticks pass
  // Date.now(); the EOD path passes the exchange close timestamp, which is what
  // the user is shown. See ADR 0001.
  pricedAt: number; // unix ms
};

export async function loadPriceCache(): Promise<PriceCache | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PriceCache>;
    if (!parsed?.prices || typeof parsed.pricedAt !== 'number') return null;
    return { prices: parsed.prices, pricedAt: parsed.pricedAt };
  } catch {
    return null;
  }
}

export async function savePriceCache(
  prices: Record<string, PriceTick>,
  pricedAt: number,
): Promise<void> {
  const cache: PriceCache = { prices, pricedAt };
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}
