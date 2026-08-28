// In-memory only, deliberately not persisted: the app must re-lock on every
// cold start, and re-lock whenever it returns from the background (see ADR
// 0002 consequences — the point is protecting an idle-but-unlocked phone).
let unlocked = false;

export function isUnlocked(): boolean {
  return unlocked;
}

export function markUnlocked(): void {
  unlocked = true;
}

export function markLocked(): void {
  unlocked = false;
}
