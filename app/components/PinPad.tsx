import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, minTapTarget, radius, spacing, type } from '../../src/theme/tokens';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function PinPad({ value, onChange, disabled }: Props) {
  const handlePress = (key: string) => {
    if (disabled) return;
    if (key === '') return;
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length < PIN_LENGTH) {
      onChange(value + key);
    }
  };

  return (
    <View>
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>

      <View style={styles.grid}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            disabled={disabled || key === ''}
            accessibilityRole={key ? 'button' : undefined}
            accessibilityLabel={key === '⌫' ? 'Delete digit' : key ? `Digit ${key}` : undefined}
            onPress={() => handlePress(key)}
            style={({ pressed }) => [
              styles.key,
              key === '' && styles.keyHidden,
              pressed && key !== '' && styles.keyPressed,
            ]}
          >
            <Text style={styles.keyLabel}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.gold500,
  },
  dotFilled: {
    backgroundColor: colors.gold500,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    minHeight: minTapTarget + 16,
    margin: '1.5%',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy700,
  },
  keyHidden: {
    backgroundColor: 'transparent',
  },
  keyPressed: {
    backgroundColor: colors.navy500,
  },
  keyLabel: {
    ...type.h1,
    color: colors.textInverse,
  },
});
