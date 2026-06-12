import { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { markOnboarded } from '../src/storage/onboarding.storage';
import { colors, minTapTarget, radius, spacing, type } from '../src/theme/tokens';

const STEPS = [
  {
    icon: '₹',
    label: 'Step 1 of 3',
    title: 'Live portfolio value,\nno login needed',
    body: 'Prices update in real time from NSE and BSE.',
  },
  {
    icon: '⊕',
    label: 'Step 2 of 3',
    title: 'Add stocks\nyou own',
    body: 'Search by name or symbol, enter your quantity.',
  },
  {
    icon: '⊙',
    label: 'Step 3 of 3',
    title: 'Everything stays\non your phone',
    body: 'Swipe left on any stock to remove it.',
  },
];

export default function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const transition = (toStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setStep(toStep);
  };

  const handleNext = () => {
    if (isLast) {
      markOnboarded().then(() => router.replace('/'));
    } else {
      transition(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) transition(step - 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Icon area */}
      <View style={styles.iconArea}>
        <View style={styles.iconRing}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{current.icon}</Text>
          </View>
        </View>
      </View>

      {/* Content area */}
      <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
        <Text style={styles.stepLabel}>{current.label}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </Animated.View>

      {/* Navigation area */}
      <View style={styles.navArea}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        {/* Primary button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next step'}
          onPress={handleNext}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        >
          <Text style={styles.primaryLabel}>
            {isLast ? 'Get started' : 'Next'}
          </Text>
        </Pressable>

        {/* Back link */}
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          >
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy900,
  },

  // ── Icon ──────────────────────────────────────────────────────────────────
  iconArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: colors.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.navy700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 52,
    color: colors.gold500,
    fontWeight: '700',
  },

  // ── Content ───────────────────────────────────────────────────────────────
  contentArea: {
    flex: 2,
    paddingHorizontal: spacing.xl + spacing.md,
    justifyContent: 'center',
    gap: spacing.md,
  },
  stepLabel: {
    ...type.caption,
    color: colors.gold500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    ...type.h1,
    color: colors.textInverse,
    marginTop: spacing.xs,
  },
  body: {
    ...type.body,
    color: colors.gold200,
    marginTop: spacing.sm,
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  navArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.navy500,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.gold500,
  },

  primaryBtn: {
    minHeight: minTapTarget + 8,
    borderRadius: radius.pill,
    backgroundColor: colors.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: { backgroundColor: colors.gold200 },
  primaryLabel: {
    ...type.h3,
    color: colors.navy900,
  },

  backBtn: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: { opacity: 0.6 },
  backLabel: {
    ...type.body,
    color: colors.gold200,
  },
  backPlaceholder: {
    height: minTapTarget,
  },
});
