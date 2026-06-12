import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PriceTick } from '../services/stream.service';

const KEY = 'pb.prices.v1';

type PriceCache = {
  prices: Record<string, PriceTick>;
  updatedAt: number; // unix ms
};

export async function loadPriceCache(): Promise<PriceCache | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PriceCache;
  } catch {
    return null;
  }
}

export async function savePriceCache(prices: Record<string, PriceTick>): Promise<void> {
  const cache: PriceCache = { prices, updatedAt: Date.now() };
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}
