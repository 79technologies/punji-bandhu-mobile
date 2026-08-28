import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { hasOnboarded } from '../src/storage/onboarding.storage';
import { hasPin } from '../src/storage/pin.storage';
import { isUnlocked } from '../src/state/lock-session';

import AddHoldingModal from './components/AddHoldingModal';
import ConnectionOverlay from './components/ConnectionOverlay';
import DiagonalStripes from './components/DiagonalStripes';
import SwipeableRow from './components/SwipeableRow';
import { fetchInstruments, findInstrument } from '../src/services/instruments.service';
import { openPriceFeed } from '../src/services/stream.service';
import { loadPriceCache, savePriceCache } from '../src/storage/prices.storage';
import { loadHoldings, saveHoldings } from '../src/storage/holdings.storage';
import { formatPriceTs } from '../src/utils/format-time';
import { colors, minTapTarget, radius, shadow, spacing, type } from '../src/theme/tokens';
import type { FeedStatus, PriceFeed, PriceTick } from '../src/services/stream.service';
import type { Holding, Instrument, InstrumentStatus } from '../src/types/domain';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const NO_PRICE = '—';

type HoldingRow = {
  holding: Holding;
  name: string;
  lastPrice: number | null;
  closePrice: number | null;
  value: number | null;
  status: InstrumentStatus | undefined;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // True only once onboarding + PIN/biometric gating have all cleared —
  // guards against flashing the real holdings UI while a redirect to
  // /pin-setup or /lock is still in flight.
  const [authorized, setAuthorized] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(true);
  const [feedData, setFeedData] = useState<Record<string, PriceTick>>({});
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('connecting');
  const [pricedAt, setPricedAt] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  const feedRef = useRef<PriceFeed | null>(null);

  useEffect(() => {
    console.log('[HomeScreen] mounted — checking onboarding state');
    hasOnboarded().then(async (val) => {
      console.log(`[HomeScreen] hasOnboarded resolved: ${val}`);
      setOnboarded(val);
      if (!val) {
        console.log('[HomeScreen] not onboarded — redirecting to /welcome');
        router.replace('/welcome');
        return;
      }

      const pinSet = await hasPin();
      if (!pinSet) {
        console.log('[HomeScreen] no PIN set — redirecting to /pin-setup');
        router.replace('/pin-setup');
        return;
      }
      if (!isUnlocked()) {
        console.log('[HomeScreen] locked — redirecting to /lock');
        router.replace('/lock');
        return;
      }

      console.log('[HomeScreen] onboarded — loading holdings and instruments');
      setAuthorized(true);
      loadHoldings()
        .then((h) => {
          console.log(`[HomeScreen] loadHoldings resolved: ${h.length} holdings`);
          setHoldings(h);
        })
        .catch((err) => console.error('[HomeScreen] loadHoldings failed:', err))
        .finally(() => setLoaded(true));
      // Last known prices are already on the device — show them straight away
      // rather than rendering an empty portfolio while the feed connects.
      loadPriceCache()
        .then((cache) => {
          if (!cache) return;
          console.log(`[HomeScreen] loadPriceCache resolved: ${Object.keys(cache.prices).length} prices`);
          setFeedData((prev) => ({ ...cache.prices, ...prev }));
          setPricedAt((prev) => prev ?? cache.pricedAt);
        })
        .catch((err) => console.error('[HomeScreen] loadPriceCache failed:', err));
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

  const applyTicks = useCallback((ticks: Record<string, PriceTick>, ts: number) => {
    setFeedData((prev) => {
      const next = { ...prev, ...ticks };
      savePriceCache(next, ts).catch(() => {
        // swallow — the next tick rewrites it; no remote logging by design
      });
      return next;
    });
    setPricedAt(ts);
  }, []);

  useEffect(() => {
    if (!loaded || holdings.length === 0 || !keysStr || !appActive) return;
    const keys = keysStr.split(',');
    const feed = openPriceFeed(keys, {
      onStatus: setFeedStatus,
      onSnapshot: (ticks) => applyTicks(ticks, Date.now()),
      onTick: (ticks) => applyTicks(ticks, Date.now()),
      // EOD carries its own timestamp — the exchange close, not the moment we
      // happened to fetch it.
      onEodPrices: (ticks, ts) => applyTicks(ticks, ts ?? Date.now()),
    });
    feedRef.current = feed;
    return () => {
      feed.close();
      feedRef.current = null;
    };
  }, [loaded, holdings.length, keysStr, appActive, applyTicks]);

  // Holdings exist but no instrument resolved to a key — the instruments fetch
  // failed with nothing cached, so no feed will ever open. Without this the
  // status would sit on 'connecting' forever behind a blur with no way out.
  useEffect(() => {
    if (loaded && !instrumentsLoading && holdings.length > 0 && !keysStr) {
      setFeedStatus('offline');
    }
  }, [loaded, instrumentsLoading, holdings.length, keysStr]);

  // A fresh connect attempt supersedes any previous dismissal.
  useEffect(() => {
    if (feedStatus !== 'offline') setDismissed(false);
  }, [feedStatus]);

  useEffect(() => {
    if (loaded) {
      saveHoldings(holdings).catch(() => {
        // swallow — next mutation will retry; no remote logging by design
      });
    }
  }, [holdings, loaded]);

  const rows = useMemo<HoldingRow[]>(() => {
    const live = feedStatus === 'live';
    return holdings.map((h) => {
      const instrument = findInstrument(instruments, h.symbol, h.exchange);
      const tick = instrument ? feedData[instrument.key] : undefined;
      const lastPrice = tick?.ltp ?? null;
      return {
        holding: h,
        name: instrument?.name ?? h.symbol,
        lastPrice,
        // Today's change is only meaningful against a live feed. A cached tick's
        // cp is yesterday's close, which would render yesterday's change as if it
        // were today's. EOD already suppresses it by sending cp=0.
        closePrice: live ? (tick?.cp ?? null) : null,
        value: lastPrice === null ? null : lastPrice * h.quantity,
        status: instrument?.status,
      };
    });
  }, [holdings, instruments, feedData, feedStatus]);

  const { total, unpriced } = useMemo(() => {
    let sum = 0;
    const unpriced: string[] = [];
    for (const r of rows) {
      if (r.value === null) unpriced.push(r.holding.symbol);
      else sum += r.value;
    }
    return { total: sum, unpriced };
  }, [rows]);

  const allUnpriced = rows.length > 0 && unpriced.length === rows.length;

  const excludesLabel = useMemo(() => {
    if (unpriced.length === 0 || allUnpriced) return null;
    if (unpriced.length === 1) return `Excludes ${unpriced[0]} — no price yet`;
    if (unpriced.length === 2) return `Excludes ${unpriced[0]} and ${unpriced[1]} — no price yet`;
    return `Excludes ${unpriced.length} holdings — no price yet`;
  }, [unpriced, allUnpriced]);

  const stampLabel = useMemo(() => {
    if (feedStatus === 'live' || pricedAt === null) return null;
    const stamp = `As of ${formatPriceTs(pricedAt)}`;
    return feedStatus === 'closed' ? `Market closed · ${stamp}` : stamp;
  }, [feedStatus, pricedAt]);

  const overlayMode = useMemo<'connecting' | 'failed' | null>(() => {
    // Nothing to connect for — never blur an empty portfolio.
    if (holdings.length === 0) return null;
    if (feedStatus === 'connecting') return 'connecting';
    if (feedStatus === 'offline' && !dismissed) return 'failed';
    return null;
  }, [holdings.length, feedStatus, dismissed]);

  const handleRetry = useCallback(() => {
    setDismissed(false);
    if (feedRef.current) {
      feedRef.current.retry();
      return;
    }
    // No feed was ever opened — the instruments fetch is what failed.
    setFeedStatus('connecting');
    setInstrumentsLoading(true);
    fetchInstruments()
      .then(setInstruments)
      .catch((err) => console.error('[HomeScreen] instruments retry failed:', err))
      .finally(() => setInstrumentsLoading(false));
  }, []);

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
      const change =
        item.closePrice !== null && item.closePrice > 0 && item.lastPrice !== null
          ? item.lastPrice - item.closePrice
          : null;
      const changePct =
        change !== null && item.closePrice !== null && item.closePrice > 0
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
                {showValues ? item.holding.quantity : '••••'} ×{' '}
                {item.lastPrice === null ? NO_PRICE : inr.format(item.lastPrice)}
              </Text>
              {change !== null && (
                <Text style={isGain ? styles.rowGain : styles.rowLoss}>
                  {isGain ? '+' : ''}{inr.format(change)} ({changePct!.toFixed(2)}%)
                </Text>
              )}
            </View>
            <Text style={styles.rowValue}>
              {item.value === null
                ? NO_PRICE
                : showValues
                  ? inr.format(item.value)
                  : '••••••'}
            </Text>
          </Pressable>
        </SwipeableRow>
      );
    },
    [handleRemove, showValues],
  );

  if (onboarded === null || !onboarded || !authorized) {
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
        {stampLabel !== null && (
          <Text style={styles.totalStamp}>{stampLabel}</Text>
        )}
        {excludesLabel !== null && (
          <Text style={styles.totalExcludes}>{excludesLabel}</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalValue}>
            {allUnpriced
              ? NO_PRICE
              : showValues
                ? inr.format(total)
                : '••••••••'}
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

      {feedStatus === 'offline' && dismissed && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Couldn&apos;t update prices.
            {pricedAt !== null ? ` Saved ${formatPriceTs(pricedAt)}.` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={handleRetry}
            style={({ pressed }) => [styles.bannerBtn, pressed && styles.bannerBtnPressed]}
          >
            <Text style={styles.bannerBtnLabel}>Try again</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.holding.exchange}:${r.holding.symbol}`}
        renderItem={renderRow}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={listEmpty}
      />

      <View style={[styles.fabWrap, { bottom: spacing.xl + insets.bottom }]}>
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

      {overlayMode !== null && (
        <ConnectionOverlay
          mode={overlayMode}
          pricedAt={pricedAt}
          onRetry={handleRetry}
          onDismiss={() => setDismissed(true)}
        />
      )}
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
  totalStamp: { ...type.caption, color: colors.gold200, opacity: 0.7, paddingHorizontal: spacing.xl, marginTop: spacing.xs },
  totalExcludes: { ...type.caption, color: colors.gold200, opacity: 0.7, paddingHorizontal: spacing.xl, marginTop: spacing.xs },
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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
  },
  bannerText: { ...type.caption, color: colors.warning, flex: 1 },
  bannerBtn: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBtnPressed: { backgroundColor: colors.warningBorder },
  bannerBtnLabel: { ...type.bodyStrong, color: colors.warning },

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
