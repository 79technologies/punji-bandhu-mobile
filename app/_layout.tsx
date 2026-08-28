import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { preventScreenCaptureAsync } from 'expo-screen-capture';

import PrivacyCover from './components/PrivacyCover';
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

// Android has no JS-visible hook into "the OS is about to snapshot this
// window for the recents thumbnail" — FLAG_SECURE is the only reliable way
// to blank it, and it also blocks screenshots/screen recording, which is a
// reasonable default for a screen that shows someone's holdings.
function useHideFromScreenCapture() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      preventScreenCaptureAsync();
    }
  }, []);
}

// iOS has no FLAG_SECURE equivalent in the managed workflow, so the app
// switcher preview is covered reactively: the instant AppState leaves
// 'active' (entering the switcher fires 'inactive' before 'background'),
// render an opaque cover so the OS captures that instead of the holdings
// screen underneath.
function usePrivacyCover() {
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      setActive(next === 'active');
    });
    return () => sub.remove();
  }, []);

  return !active;
}

export default function RootLayout() {
  useRelockOnResume();
  useHideFromScreenCapture();
  const covered = usePrivacyCover();

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F7F5F0' },
        }}
      />
      {covered && <PrivacyCover />}
    </SafeAreaProvider>
  );
}
