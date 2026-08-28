import { BlurView } from 'expo-blur';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPriceTs } from '../../src/utils/format-time';
import { colors, minTapTarget, radius, shadow, spacing, type } from '../../src/theme/tokens';

type Props = {
  /** 'connecting' shows a spinner; 'failed' shows the retry card. */
  mode: 'connecting' | 'failed';
  /** When the cached prices underneath are from — null when there is no cache. */
  pricedAt: number | null;
  onRetry: () => void;
  onDismiss: () => void;
};

/**
 * Full-screen blur over the portfolio while prices are unconfirmed.
 *
 * Blocks all touches by design — see ADR 0001, which records this as a deliberate
 * exception to product invariant #4. Nothing beneath it is reachable, so the
 * dismiss action is the only way back to the cached numbers, and it is offered
 * only when there are cached numbers to go back to.
 */
export default function ConnectionOverlay({ mode, pricedAt, onRetry, onDismiss }: Props) {
  const canDismiss = pricedAt !== null;

  return (
    <BlurView
      intensity={32}
      tint="light"
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      // Android does not honour accessibilityViewIsModal; this at least gets the
      // status read out when it changes.
      accessibilityLiveRegion={Platform.OS === 'android' ? 'polite' : 'none'}
    >
      <View style={styles.centre}>
        {mode === 'connecting' ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" color={colors.navy500} />
            <Text style={styles.connectingLabel}>Getting latest prices…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.failedTitle}>
              {canDismiss ? "Couldn't get latest prices." : "Couldn't get prices."}
            </Text>
            {canDismiss && (
              <Text style={styles.failedBody}>
                Showing prices saved on {formatPriceTs(pricedAt)}.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try again"
              onPress={onRetry}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            >
              <Text style={styles.primaryLabel}>Try again</Text>
            </Pressable>

            {canDismiss && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show saved prices"
                onPress={onDismiss}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              >
                <Text style={styles.secondaryLabel}>Show saved prices</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.cardStrong,
  },
  connectingLabel: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  failedTitle: { ...type.h3, color: colors.navy900, textAlign: 'center' },
  failedBody: { ...type.body, color: colors.textSecondary, textAlign: 'center' },

  primaryBtn: {
    alignSelf: 'stretch',
    minHeight: minTapTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  primaryBtnPressed: { backgroundColor: colors.navy700 },
  primaryLabel: { ...type.h3, color: colors.textInverse },

  secondaryBtn: {
    alignSelf: 'stretch',
    minHeight: minTapTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryBtnPressed: { backgroundColor: colors.surfaceSunken },
  secondaryLabel: { ...type.bodyStrong, color: colors.navy700 },
});
