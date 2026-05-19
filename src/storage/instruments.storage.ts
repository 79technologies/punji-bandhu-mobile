import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Instrument } from '../types/domain';

const INSTRUMENTS_KEY = 'pb.instruments.v1';
const HASH_KEY = 'pb.instruments.hash.v1';

export async function loadCachedInstruments(): Promise<{ instruments: Instrument[]; hash: string | null }> {
  try {
    const pairs = await AsyncStorage.multiGet([INSTRUMENTS_KEY, HASH_KEY]);
    const rawInstruments = pairs[0][1];
    const hash = pairs[1][1];
    const instruments = rawInstruments ? (JSON.parse(rawInstruments) as Instrument[]) : [];
    return { instruments, hash };
  } catch {
    return { instruments: [], hash: null };
  }
}

export async function saveCachedInstruments(instruments: Instrument[], hash: string): Promise<void> {
  await AsyncStorage.multiSet([
    [INSTRUMENTS_KEY, JSON.stringify(instruments)],
    [HASH_KEY, hash],
  ]);
}
