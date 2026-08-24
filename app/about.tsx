import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { colors, minTapTarget, radius, spacing, type } from '../src/theme/tokens';

// Must resolve to a live, publicly readable page before the Play Store
// submission — Google requires a reachable privacy policy URL for every app,
// and the Data safety declaration is checked against it.
const PRIVACY_POLICY_URL = 'https://punji-bandhu.79technologies.com/privacy';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <Text style={styles.backLabel}>‹  Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>About Punji Bandhu</Text>

        <Text style={styles.lede}>
          Punji Bandhu shows you what the stocks you already own are worth today.
          Add a stock, enter how many shares you hold, and the app keeps the
          total up to date. That is all it does.
        </Text>

        <Section title="Your privacy">
          <Bullet>There is no login. No phone number, no email, no OTP, no account.</Bullet>
          <Bullet>
            Your holdings — the stocks and the quantities — are saved only on this
            phone. They are never uploaded anywhere.
          </Bullet>
          <Bullet>
            There is no analytics, no advertising, and no tracking of any kind. We
            do not know who you are and we do not want to.
          </Bullet>
          <Bullet>
            Uninstalling the app deletes your holdings from the phone completely.
          </Bullet>
        </Section>

        <Section title="What leaves your phone">
          <Text style={styles.body}>
            To show live prices, the app asks our price server for the current
            price of each stock symbol you have added. That request contains only
            the symbols — for example RELIANCE or TCS. It never contains how many
            shares you own, what they are worth, your name, or anything that
            identifies you or your device.
          </Text>
        </Section>

        <Section title="About the prices">
          <Bullet>
            Prices are shown for information only. Nothing in this app is
            investment advice, a recommendation, or an offer to buy or sell.
          </Bullet>
          <Bullet>
            Prices may be delayed and may differ from your broker&apos;s figures.
            Always confirm with your broker before acting on anything you see here.
          </Bullet>
          <Bullet>
            Punji Bandhu is not affiliated with, endorsed by, or connected to NSE,
            BSE, SEBI, or any stockbroker.
          </Bullet>
        </Section>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Read the full privacy policy in your browser"
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
        >
          <Text style={styles.linkLabel}>Read the full privacy policy</Text>
        </Pressable>

        <Text style={styles.version}>Version {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backBtn: {
    minHeight: minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: radius.md,
  },
  backBtnPressed: { backgroundColor: colors.surfaceSunken },
  backLabel: { ...type.bodyStrong, color: colors.navy700 },

  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.hero,
  },

  title: { ...type.h1, color: colors.textPrimary, marginTop: spacing.sm },
  lede: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },

  section: { marginTop: spacing.xxl },
  sectionTitle: {
    ...type.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  body: { ...type.body, color: colors.textSecondary },

  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  bulletDot: { ...type.body, color: colors.gold500 },
  bulletText: { ...type.body, color: colors.textSecondary, flex: 1 },

  linkBtn: {
    marginTop: spacing.xxl,
    minHeight: minTapTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  linkBtnPressed: { backgroundColor: colors.surfaceSunken },
  linkLabel: { ...type.bodyStrong, color: colors.navy700 },

  version: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
