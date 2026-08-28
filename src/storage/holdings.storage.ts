import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Holding } from '../types/domain';

const KEY = 'pb.holdings.v1';

export async function loadHoldings(): Promise<Holding[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHolding);
  } catch {
    return [];
  }
}

export async function saveHoldings(holdings: Holding[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(holdings));
}

export async function clearHoldings(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

function isHolding(value: unknown): value is Holding {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.symbol === 'string' &&
    typeof v.quantity === 'number' &&
    (v.exchange === 'NSE' || v.exchange === 'BSE')
  );
}
