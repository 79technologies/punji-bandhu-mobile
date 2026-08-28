import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const HASH_KEY = 'pb.pin.hash.v1';
const ATTEMPTS_KEY = 'pb.pin.attempts.v1';

const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_MS = 30_000;

type Attempts = { count: number; lockoutUntil: number | null };

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(HASH_KEY)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(HASH_KEY, `${salt}:${hash}`);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(HASH_KEY);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
}

async function readAttempts(): Promise<Attempts> {
  const raw = await SecureStore.getItemAsync(ATTEMPTS_KEY);
  if (!raw) return { count: 0, lockoutUntil: null };
  try {
    return JSON.parse(raw) as Attempts;
  } catch {
    return { count: 0, lockoutUntil: null };
  }
}

// Locked-out PIN entry: how many ms remain, or 0 if not currently locked out.
export async function lockoutRemainingMs(): Promise<number> {
  const { lockoutUntil } = await readAttempts();
  if (!lockoutUntil) return 0;
  return Math.max(0, lockoutUntil - Date.now());
}

export async function verifyPin(pin: string): Promise<boolean> {
  const remaining = await lockoutRemainingMs();
  if (remaining > 0) return false;

  const stored = await SecureStore.getItemAsync(HASH_KEY);
  if (!stored) return false;
  const [salt, expectedHash] = stored.split(':');
  const candidateHash = await hashPin(pin, salt);

  if (candidateHash === expectedHash) {
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
    return true;
  }

  const attempts = await readAttempts();
  const count = attempts.count + 1;
  const lockoutUntil =
    count >= MAX_ATTEMPTS_BEFORE_LOCKOUT ? Date.now() + LOCKOUT_MS : null;
  const next: Attempts = { count: lockoutUntil ? 0 : count, lockoutUntil };
  await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify(next));
  return false;
}
