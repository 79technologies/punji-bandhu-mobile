import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import PinPad from './components/PinPad';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from '../src/services/biometric.service';
import { lockoutRemainingMs, verifyPin } from '../src/storage/pin.storage';
import { wipeLocalDataAndPin } from '../src/services/reset.service';
import { markUnlocked } from '../src/state/lock-session';
import { colors, minTapTarget, radius, spacing, type } from '../src/theme/tokens';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const attemptedBiometric = useRef(false);

  const unlock = useCallback(() => {
    markUnlocked();
    router.replace('/');
  }, []);

  const tryBiometrics = useCallback(async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) unlock();
  }, [unlock]);

  useEffect(() => {
    isBiometricAvailable().then((available) => {
      setBiometricAvailable(available);
      if (available && !attemptedBiometric.current) {
        attemptedBiometric.current = true;
        tryBiometrics();
      }
    });
  }, [tryBiometrics]);

  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const id = setInterval(() => {
      lockoutRemainingMs().then((ms) => setLockoutSecs(Math.ceil(ms / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutSecs]);

  const handlePinChange = (next: string) => {
    setError(null);
    setPin(next);
    if (next.length !== 4) return;

    verifyPin(next).then((ok) => {
      if (ok) {
        unlock();
        return;
      }
      setPin('');
      lockoutRemainingMs().then((ms) => {
        if (ms > 0) {
          setLockoutSecs(Math.ceil(ms / 1000));
          setError('Too many wrong tries. Wait a bit and try again.');
        } else {
          setError('Wrong PIN. Try again.');
        }
      });
    });
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot your PIN?',
      "There's no account to reset it through. Continuing will erase your saved holdings from this phone so you can start again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase and start over',
          style: 'destructive',
          onPress: () => {
            wipeLocalDataAndPin().then(() => router.replace('/welcome'));
          },
        },
      ],
    );
  };

  const locked = lockoutSecs > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Punji Bandhu is locked</Text>
        <Text style={styles.body}>Enter your PIN to continue.</Text>
        {error !== null && (
          <Text style={styles.error}>
            {locked ? `${error} (${lockoutSecs}s)` : error}
          </Text>
        )}
      </View>

      <View style={styles.padArea}>
        <PinPad value={pin} onChange={handlePinChange} disabled={locked} />
      </View>

      <View style={styles.footer}>
        {biometricAvailable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try fingerprint or face unlock again"
            onPress={tryBiometrics}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
          >
            <Text style={styles.linkLabel}>Use fingerprint or face instead</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot PIN"
          onPress={handleForgotPin}
          style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
        >
          <Text style={styles.linkLabel}>Forgot PIN?</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy900,
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  title: { ...type.h1, color: colors.textInverse },
  body: { ...type.body, color: colors.gold200 },
  error: { ...type.bodyStrong, color: '#F0A0A0' },
  padArea: {
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  linkBtn: {
    minHeight: minTapTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnPressed: { backgroundColor: colors.navy700 },
  linkLabel: { ...type.bodyStrong, color: colors.gold200 },
});
