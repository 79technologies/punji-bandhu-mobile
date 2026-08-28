import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import PinPad from './components/PinPad';
import { setPin } from '../src/storage/pin.storage';
import { markUnlocked } from '../src/state/lock-session';
import { colors, spacing, type } from '../src/theme/tokens';

type Stage = 'create' | 'confirm';

export default function PinSetupScreen() {
  const [stage, setStage] = useState<Stage>('create');
  const [firstPin, setFirstPin] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (next: string) => {
    setError(null);
    setValue(next);
    if (next.length !== 4) return;

    if (stage === 'create') {
      setFirstPin(next);
      setValue('');
      setStage('confirm');
      return;
    }

    if (next === firstPin) {
      setPin(next)
        .then(() => {
          markUnlocked();
          router.replace('/');
        })
        .catch(() => setError('Could not save your PIN. Try again.'));
    } else {
      setError("Those didn't match. Choose your PIN again.");
      setFirstPin('');
      setValue('');
      setStage('create');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {stage === 'create' ? 'Choose a PIN' : 'Enter it again'}
        </Text>
        <Text style={styles.body}>
          {stage === 'create'
            ? 'You’ll use this 4-digit PIN to open Punji Bandhu when your fingerprint or face isn’t available.'
            : 'Type the same 4 digits to confirm.'}
        </Text>
        {error !== null && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.padArea}>
        <PinPad value={value} onChange={handleChange} />
      </View>

      <Text style={styles.footnote}>
        If you forget this PIN, there’s no account to reset it — your saved
        holdings will need to be entered again.
      </Text>
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
  footnote: {
    ...type.caption,
    color: colors.gold200,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
