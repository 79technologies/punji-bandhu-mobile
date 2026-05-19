import { useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, minTapTarget, type } from '../../src/theme/tokens';

const ACTION_WIDTH = 80;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.35;

type Props = {
  onDelete: () => void;
  children: React.ReactNode;
};

export default function SwipeableRow({ onDelete, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const open = () => {
    isOpen.current = true;
    Animated.spring(translateX, { toValue: -ACTION_WIDTH, useNativeDriver: true }).start();
  };

  const close = () => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the touch when horizontal movement clearly dominates
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderMove: (_, g) => {
        const base = isOpen.current ? -ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(-ACTION_WIDTH, base + g.dx));
        translateX.setValue(next);
      },

      onPanResponderRelease: (_, g) => {
        const base = isOpen.current ? -ACTION_WIDTH : 0;
        const current = base + g.dx;
        if (current < -OPEN_THRESHOLD) {
          open();
        } else {
          close();
        }
      },

      onPanResponderTerminate: () => close(),
    }),
  ).current;

  return (
    <View style={styles.container}>
      {/* Delete action sits behind the row */}
      <View style={styles.actionSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete holding"
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.deleteBtnPressed,
          ]}
        >
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  actionSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    backgroundColor: colors.loss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: ACTION_WIDTH,
    minHeight: minTapTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnPressed: { opacity: 0.75 },
  deleteLabel: { ...type.bodyStrong, color: '#FFFFFF' },
});
