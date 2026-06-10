import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchInstruments } from '../../src/services/instruments.service';
import type { Holding, Instrument } from '../../src/types/domain';
import { colors, minTapTarget, radius, spacing, type } from '../../src/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (holding: Holding) => void;
  instruments: Instrument[];
  instrumentsLoading: boolean;
};

export default function AddHoldingModal({ visible, onClose, onAdd, instruments, instrumentsLoading }: Props) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Instrument | null>(null);
  const [quantity, setQuantity] = useState('');

  const results = useMemo(() => searchInstruments(instruments, query), [instruments, query]);

  const reset = () => {
    setQuery('');
    setPicked(null);
    setQuantity('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!picked) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    onAdd({ symbol: picked.symbol, exchange: picked.exchange, quantity: qty });
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {picked ? 'How many shares?' : 'Add a stock'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={handleClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          {picked ? (
            <View style={styles.qtyStep}>
              <View style={styles.pickedCard}>
                <Text style={styles.pickedSymbol}>{picked.symbol}</Text>
                <Text style={styles.pickedName}>{picked.name}</Text>
                <Text style={styles.pickedMeta}>{picked.exchange}</Text>
              </View>

              <Text style={styles.label}>Quantity</Text>
              <TextInput
                value={quantity}
                onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="e.g. 50"
                placeholderTextColor={colors.textMuted}
                style={styles.qtyInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              <View style={styles.qtyActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to search"
                  onPress={() => setPicked(null)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && styles.secondaryBtnPressed,
                  ]}
                >
                  <Text style={styles.secondaryLabel}>Back</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add to portfolio"
                  onPress={handleSave}
                  disabled={!quantity || Number(quantity) <= 0}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!quantity || Number(quantity) <= 0) && styles.primaryBtnDisabled,
                    pressed && styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={styles.primaryLabel}>Add</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search NSE / BSE — e.g. RELIANCE, TCS"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
              />
              <FlatList
                data={results}
                keyExtractor={(s) => `${s.exchange}:${s.symbol}`}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  instrumentsLoading ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator size="large" color={colors.navy500} />
                      <Text style={styles.empty}>Loading stocks…</Text>
                    </View>
                  ) : instruments.length === 0 ? (
                    <Text style={styles.empty}>
                      Could not load stock list. Check your connection and try again.
                    </Text>
                  ) : (
                    <Text style={styles.empty}>
                      No matches. Try another symbol or company name.
                    </Text>
                  )
                }
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.name}`}
                    onPress={() => setPicked(item)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && styles.resultRowPressed,
                    ]}
                  >
                    <View style={styles.resultMain}>
                      <View style={styles.resultSymbolRow}>
                        <Text style={styles.resultSymbol}>{item.symbol}</Text>
                        {item.status !== 'active' && (
                          <View style={item.status === 'suspended' ? styles.badgeSuspended : styles.badgeDelisted}>
                            <Text style={item.status === 'suspended' ? styles.badgeSuspendedText : styles.badgeDelistedText}>
                              {item.status === 'suspended' ? 'SUSPENDED' : 'DELISTED'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={styles.resultExchange}>{item.exchange}</Text>
                  </Pressable>
                )}
              />
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...type.h2, color: colors.navy900, flex: 1 },
  closeBtn: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: { backgroundColor: colors.surfaceSunken },
  closeLabel: { ...type.bodyStrong, color: colors.navy700 },

  search: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: minTapTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    ...type.body,
  },

  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing.xl },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },

  resultSymbolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: minTapTarget + 8,
    backgroundColor: colors.surface,
  },
  resultRowPressed: { backgroundColor: colors.surfaceSunken },
  resultMain: { flex: 1, paddingRight: spacing.md },
  resultSymbol: { ...type.bodyStrong, color: colors.navy900 },
  resultName: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  resultExchange: { ...type.caption, color: colors.textMuted },

  qtyStep: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  pickedCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickedSymbol: { ...type.h2, color: colors.navy900 },
  pickedName: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  pickedMeta: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },

  label: { ...type.bodyStrong, color: colors.textPrimary, marginTop: spacing.md },
  qtyInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: minTapTarget + 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    ...type.h2,
  },

  qtyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primaryBtn: {
    flex: 1,
    minHeight: minTapTarget + 8,
    borderRadius: radius.md,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: { backgroundColor: colors.navy700 },
  primaryBtnDisabled: { backgroundColor: colors.navy500, opacity: 0.6 },
  primaryLabel: { ...type.h3, color: colors.textInverse },
  secondaryBtn: {
    flex: 1,
    minHeight: minTapTarget + 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: { backgroundColor: colors.surfaceSunken },
  secondaryLabel: { ...type.bodyStrong, color: colors.navy700 },
});
