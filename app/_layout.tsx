import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { hasOnboarded } from '../src/storage/onboarding.storage';
import { hasPin } from '../src/storage/pin.storage';
import { markLocked } from '../src/state/lock-session';

// Screens the relock-on-resume redirect must never fire from — the lock/PIN
// screens don't have anything to protect, and re-onboarding hasn't set a PIN
// yet.
const GATE_EXEMPT_ROUTES = new Set(['/lock', '/pin-setup', '/welcome']);

function useRelockOnResume() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      const cameToForeground = /inactive|background/.test(prev) && next === 'active';
      if (!cameToForeground) return;

      // Mark locked immediately (see ADR 0002) — a phone left idle-but-open
      // must re-prompt, not silently stay unlocked.
      markLocked();
      if (GATE_EXEMPT_ROUTES.has(pathnameRef.current)) return;

      Promise.all([hasOnboarded(), hasPin()]).then(([onboarded, pinSet]) => {
        if (onboarded && pinSet) router.replace('/lock');
      });
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useRelockOnResume();

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F7F5F0' },
        }}
      />
    </SafeAreaProvider>
  );
}
