import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Instrument } from '../types/domain';

const INSTRUMENTS_KEY = 'pb.instruments.v2';
const HASH_KEY = 'pb.instruments.hash.v2';

export async function loadCachedInstruments(): Promise<{ instruments: Instrument[]; hash: string | null }> {
  console.log('[storage/instruments] loadCachedInstruments: reading from AsyncStorage');
  try {
    const pairs = await AsyncStorage.multiGet([INSTRUMENTS_KEY, HASH_KEY]);
    const rawInstruments = pairs[0][1];
    const hash = pairs[1][1];
    const instruments = rawInstruments ? (JSON.parse(rawInstruments) as Instrument[]) : [];
    console.log(`[storage/instruments] loadCachedInstruments: found ${instruments.length} cached instruments, hash=${hash ?? 'null'}`);
    return { instruments, hash };
  } catch (err) {
    console.error('[storage/instruments] loadCachedInstruments: AsyncStorage read failed:', err);
    return { instruments: [], hash: null };
  }
}

export async function saveCachedInstruments(instruments: Instrument[], hash: string): Promise<void> {
  console.log(`[storage/instruments] saveCachedInstruments: saving ${instruments.length} instruments, hash=${hash}`);
  await AsyncStorage.multiSet([
    [INSTRUMENTS_KEY, JSON.stringify(instruments)],
    [HASH_KEY, hash],
  ]);
  console.log('[storage/instruments] saveCachedInstruments: saved');
}
