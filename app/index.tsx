import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { hasOnboarded } from '../src/storage/onboarding.storage';

import AddHoldingModal from './components/AddHoldingModal';
import SwipeableRow from './components/SwipeableRow';
import { fetchInstruments, findInstrument } from '../src/services/instruments.service';
import { openPriceFeed, type PriceTick } from '../src/services/stream.service';
import { loadHoldings, saveHoldings } from '../src/storage/holdings.storage';
import { colors, minTapTarget, radius, shadow, spacing, type } from '../src/theme/tokens';
import type { Holding, Instrument } from '../src/types/domain';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

type HoldingRow = {
  holding: Holding;
  name: string;
  lastPrice: number;
  closePrice: number;
  value: number;
};

export default function HomeScreen() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(true);
  const [feedData, setFeedData] = useState<Record<string, PriceTick>>({});
  const [loaded, setLoaded] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    hasOnboarded().then((val) => {
      setOnboarded(val);
      if (!val) {
        router.replace('/welcome');
      } else {
        loadHoldings()
          .then(setHoldings)
          .finally(() => setLoaded(true));
        fetchInstruments()
          .then(setInstruments)
          .finally(() => setInstrumentsLoading(false));
      }
    });
  }, []);

  // Derive a stable comma-joined key string so the stream only reconnects when
  // the actual set of subscribed instruments changes.
  const keysStr = useMemo(() => {
    return holdings
      .map((h) => findInstrument(instruments, h.symbol, h.exchange)?.key)
      .filter((k): k is string => !!k)
      .sort()
      .join(',');
  }, [holdings, instruments]);

  useEffect(() => {
    console.log(`[index] stream effect — loaded=${loaded} holdings=${holdings.length} keysStr="${keysStr}"`);
    if (!loaded || holdings.length === 0 || !keysStr) return;
    console.log(`[index] opening stream for keys:`, keysStr.split(','));
    return openPriceFeed(keysStr.split(','), (ticks) => {
      console.log(`[index] feedData update:`, ticks);
      setFeedData((prev) => ({ ...prev, ...ticks }));
    });
  }, [loaded, holdings.length, keysStr]);

  useEffect(() => {
    if (loaded) {
      saveHoldings(holdings).catch(() => {
        // swallow — next mutation will retry; no remote logging by design
      });
    }
  }, [holdings, loaded]);

  const rows = useMemo<HoldingRow[]>(() => {
    return holdings.map((h) => {
      const instrument = findInstrument(instruments, h.symbol, h.exchange);
      const tick = instrument ? feedData[instrument.key] : undefined;
      const lastPrice = tick?.ltp ?? 0;
      const closePrice = tick?.cp ?? 0;
      return {
        holding: h,
        name: instrument?.name ?? h.symbol,
        lastPrice,
        closePrice,
        value: lastPrice * h.quantity,
      };
    });
  }, [holdings, instruments, feedData]);

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + r.value, 0),
    [rows],
  );

  const listEmpty = useMemo(() => {
    if (!loaded) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.navy500} />
          <Text style={styles.emptyBody}>Loading your portfolio…</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No holdings yet</Text>
        <Text style={styles.emptyBody}>Tap "Add stock" to track your first holding.</Text>
      </View>
    );
  }, [loaded]);

  const handleAdd = useCallback((next: Holding) => {
    setHoldings((prev) => {
      const idx = prev.findIndex(
        (h) => h.symbol === next.symbol && h.exchange === next.exchange,
      );
      if (idx === -1) return [...prev, next];
      const merged = [...prev];
      merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + next.quantity };
      return merged;
    });
  }, []);

  const handleRemove = useCallback((row: HoldingRow) => {
    setHoldings((prev) =>
      prev.filter(
        (h) =>
          !(h.symbol === row.holding.symbol && h.exchange === row.holding.exchange),
      ),
    );
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: HoldingRow }) => {
      const change = item.closePrice > 0 ? item.lastPrice - item.closePrice : null;
      const changePct = change !== null && item.closePrice > 0
        ? (change / item.closePrice) * 100
        : null;
      const isGain = change !== null && change >= 0;

      return (
        <SwipeableRow onDelete={() => handleRemove(item)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.holding.symbol}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowSymbolRow}>
                <Text style={styles.rowSymbol}>{item.holding.symbol}</Text>
                <View style={styles.exchangeBadge}>
                  <Text style={styles.exchangeLabel}>{item.holding.exchange}</Text>
                </View>
              </View>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta}>
                {showValues ? item.holding.quantity : '••••'} × {inr.format(item.lastPrice)}
              </Text>
              {change !== null && (
                <Text style={isGain ? styles.rowGain : styles.rowLoss}>
                  {isGain ? '+' : ''}{inr.format(change)} ({changePct!.toFixed(2)}%)
                </Text>
              )}
            </View>
            <Text style={styles.rowValue}>
              {showValues ? inr.format(item.value) : '••••••'}
            </Text>
          </Pressable>
        </SwipeableRow>
      );
    },
    [handleRemove, showValues],
  );

  if (onboarded === null || !onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.navy500} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.totalCard}>
        <View style={styles.totalCardAccent} />
        <Text style={styles.totalLabel}>Total portfolio</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalValue}>
            {showValues ? inr.format(total) : '••••••••'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showValues ? 'Hide values' : 'Show values'}
            onPress={() => setShowValues((v) => !v)}
            hitSlop={12}
            style={({ pressed }) => [
              styles.eyeBtn,
              pressed && styles.eyeBtnPressed,
            ]}
          >
            <Text style={styles.eyeLabel}>{showValues ? '⊙' : '⊘'}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.holding.exchange}:${r.holding.symbol}`}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={listEmpty}
      />

      <View style={styles.fabWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a stock"
          onPress={() => setAdding(true)}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={styles.fabLabel}>+  Add stock</Text>
        </Pressable>
      </View>

      <AddHoldingModal
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={handleAdd}
        instruments={instruments}
        instrumentsLoading={instrumentsLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },

  totalCard: {
    margin: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.navy900,
    overflow: 'hidden',
    ...shadow.cardStrong,
  },
  totalCardAccent: {
    height: 3,
    backgroundColor: colors.gold500,
  },
  totalLabel: { ...type.bodyStrong, color: colors.gold200, letterSpacing: 0.4, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  totalValue: {
    ...type.display,
    color: colors.textInverse,
    flexShrink: 1,
  },
  eyeBtn: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtnPressed: { backgroundColor: colors.navy700 },
  eyeLabel: { fontSize: 20, color: colors.gold200 },

  listContent: { paddingBottom: 120 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  rowPressed: { backgroundColor: colors.surfaceSunken },
  rowLeft: { flex: 1, paddingRight: spacing.md },
  rowSymbolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowSymbol: { ...type.bodyStrong, color: colors.navy900 },
  exchangeBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exchangeLabel: { fontSize: 11, fontWeight: '600' as const, color: colors.textMuted, letterSpacing: 0.3 },
  rowName: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  rowMeta: { ...type.caption, color: colors.textMuted, marginTop: 4 },
  rowGain: { ...type.caption, color: colors.gain, marginTop: 2 },
  rowLoss: { ...type.caption, color: colors.loss, marginTop: 2 },
  rowValue: { ...type.h3, color: colors.navy900 },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.xl,
  },

  empty: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...type.h2, color: colors.navy900 },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center' },

  fabWrap: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
  },
  fab: {
    minHeight: minTapTarget + 8,
    borderRadius: radius.pill,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadow.card,
  },
  fabPressed: { backgroundColor: colors.navy700 },
  fabLabel: { ...type.h3, color: colors.textInverse },
});
