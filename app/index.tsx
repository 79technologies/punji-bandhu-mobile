import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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
import DiagonalStripes from './components/DiagonalStripes';
import SwipeableRow from './components/SwipeableRow';
import { fetchInstruments, findInstrument } from '../src/services/instruments.service';
import { openPriceFeed } from '../src/services/stream.service';
import { fetchEod } from '../src/services/eod.service';
import { savePriceCache } from '../src/storage/prices.storage';
import { loadHoldings, saveHoldings } from '../src/storage/holdings.storage';
import { colors, minTapTarget, radius, shadow, spacing, type } from '../src/theme/tokens';
import type { PriceTick } from '../src/services/stream.service';
import type { Holding, Instrument, InstrumentStatus } from '../src/types/domain';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function formatEodTs(ts: number): string {
  // Use ts only for the date — time is always 3:30 PM (market close)
  const d = new Date(ts + IST_OFFSET_MS);
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  return `${day} ${month}, 3:30 PM`;
}

type HoldingRow = {
  holding: Holding;
  name: string;
  lastPrice: number;
  closePrice: number;
  value: number;
  status: InstrumentStatus | undefined;
};

export default function HomeScreen() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(true);
  const [feedData, setFeedData] = useState<Record<string, PriceTick>>({});
  const [feedStatus, setFeedStatus] = useState<'connecting' | 'live' | 'closed'>('connecting');
  const [eodTs, setEodTs] = useState<number | null>(null);
  const [appActive, setAppActive] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  useEffect(() => {
    console.log('[HomeScreen] mounted — checking onboarding state');
    hasOnboarded().then((val) => {
      console.log(`[HomeScreen] hasOnboarded resolved: ${val}`);
      setOnboarded(val);
      if (!val) {
        console.log('[HomeScreen] not onboarded — redirecting to /welcome');
        router.replace('/welcome');
      } else {
        console.log('[HomeScreen] onboarded — loading holdings and instruments');
        loadHoldings()
          .then((h) => {
            console.log(`[HomeScreen] loadHoldings resolved: ${h.length} holdings`);
            setHoldings(h);
          })
          .catch((err) => console.error('[HomeScreen] loadHoldings failed:', err))
          .finally(() => setLoaded(true));
        console.log('[HomeScreen] calling fetchInstruments');
        fetchInstruments()
          .then((list) => {
            console.log(`[HomeScreen] fetchInstruments resolved: ${list.length} instruments`);
            setInstruments(list);
          })
          .catch((err) => console.error('[HomeScreen] fetchInstruments threw unexpectedly:', err))
          .finally(() => {
            console.log('[HomeScreen] instrumentsLoading → false');
            setInstrumentsLoading(false);
          });
      }
    }).catch((err) => {
      console.error('[HomeScreen] hasOnboarded failed:', err);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
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
    if (!loaded || holdings.length === 0 || !keysStr || !appActive) return;
    setFeedStatus('connecting');
    setEodTs(null);
    const keys = keysStr.split(',');
    return openPriceFeed(keys, {
      onSnapshot: (ticks) => {
        setFeedStatus('live');
        setFeedData((prev) => {
          const next = { ...prev, ...ticks };
          savePriceCache(next).catch(() => {});
          return next;
        });
      },
      onTick: (ticks) => {
        setFeedData((prev) => {
          const next = { ...prev, ...ticks };
          savePriceCache(next).catch(() => {});
          return next;
        });
      },
      onMarketClosed: () => {
        setFeedStatus('closed');
        fetchEod(keys).then((prices) => {
          const ticks: Record<string, PriceTick> = {};
          let latestTs: number | null = null;
          for (const [key, p] of Object.entries(prices)) {
            // cp=0 hides the change row — there's no intraday change in EOD
            ticks[key] = { ltp: p.close, cp: 0 };
            if (latestTs === null || p.ts > latestTs) latestTs = p.ts;
          }
          setFeedData((prev) => ({ ...prev, ...ticks }));
          if (latestTs !== null) setEodTs(latestTs);
        }).catch(() => {});
      },
    });
  }, [loaded, holdings.length, keysStr, appActive]);

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
        status: instrument?.status,
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
        <Text style={styles.emptyBody}>Tap &quot;Add stock&quot; to track your first holding.</Text>
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

  const handleEdit = useCallback((updated: Holding) => {
    setHoldings((prev) =>
      prev.map((h) =>
        h.symbol === updated.symbol && h.exchange === updated.exchange
          ? { ...h, quantity: updated.quantity }
          : h,
      ),
    );
  }, []);

  const handleModalClose = useCallback(() => {
    setAdding(false);
    setEditingHolding(null);
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
            accessibilityLabel={`Edit ${item.holding.symbol}`}
            onPress={() => setEditingHolding(item.holding)}
            style={({ pressed }) => [
              styles.row,
              item.status === 'suspended' && styles.rowSuspended,
              item.status === 'delisted' && styles.rowDelisted,
              pressed && styles.rowPressed,
            ]}
          >
            {item.status === 'suspended' && (
              <DiagonalStripes color="#D97706" opacity={0.12} />
            )}
            {item.status === 'delisted' && (
              <DiagonalStripes color="#DC2626" opacity={0.1} />
            )}
            <View style={styles.rowLeft}>
              <View style={styles.rowSymbolRow}>
                <Text style={styles.rowSymbol}>{item.holding.symbol}</Text>
                <View style={styles.exchangeBadge}>
                  <Text style={styles.exchangeLabel}>{item.holding.exchange}</Text>
                </View>
                {item.status === 'suspended' && (
                  <View style={styles.badgeSuspended}>
                    <Text style={styles.badgeSuspendedText}>SUSPENDED</Text>
                  </View>
                )}
                {item.status === 'delisted' && (
                  <View style={styles.badgeDelisted}>
                    <Text style={styles.badgeDelistedText}>DELISTED</Text>
                  </View>
                )}
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
      <View style={styles.appBar}>
        <Text style={styles.wordmark}>Punji Bandhu</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="About this app and privacy"
          onPress={() => router.push('/about')}
          hitSlop={8}
          style={({ pressed }) => [styles.aboutBtn, pressed && styles.aboutBtnPressed]}
        >
          <Text style={styles.aboutLabel}>About</Text>
        </Pressable>
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalCardAccent} />
        <Text style={styles.totalLabel}>Total portfolio</Text>
        {feedStatus === 'closed' && (
          <Text style={styles.marketClosedLabel}>
            Market closed{eodTs !== null ? ` · As of ${formatEodTs(eodTs)}` : ''}
          </Text>
        )}
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
          onPress={() => { setEditingHolding(null); setAdding(true); }}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={styles.fabLabel}>+  Add stock</Text>
        </Pressable>
      </View>

      <AddHoldingModal
        visible={adding || editingHolding !== null}
        onClose={handleModalClose}
        onAdd={handleAdd}
        onSave={handleEdit}
        editHolding={editingHolding ?? undefined}
        instruments={instruments}
        instrumentsLoading={instrumentsLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  wordmark: { ...type.h3, color: colors.textPrimary },
  aboutBtn: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutBtnPressed: { backgroundColor: colors.surfaceSunken },
  aboutLabel: { ...type.bodyStrong, color: colors.navy700 },

  totalCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
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
  marketClosedLabel: { ...type.caption, color: colors.gold200, opacity: 0.7, paddingHorizontal: spacing.xl, marginTop: spacing.xs },
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
    overflow: 'hidden',
  },
  rowSuspended: { backgroundColor: '#FEFCE8' },
  rowDelisted: { backgroundColor: '#FFF1F2' },
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
  badgeSuspended: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#FEF9C3',
  },
  badgeSuspendedText: { fontSize: 10, fontWeight: '700' as const, color: '#B45309', letterSpacing: 0.4 },
  badgeDelisted: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#FEE2E2',
  },
  badgeDelistedText: { fontSize: 10, fontWeight: '700' as const, color: '#A12626', letterSpacing: 0.4 },
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
