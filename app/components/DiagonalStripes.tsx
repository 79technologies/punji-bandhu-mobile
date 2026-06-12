import { StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  opacity?: number;
  gap?: number;
  width?: number;
};

export default function DiagonalStripes({
  color,
  opacity = 0.45,
  gap = 11,
  width = 5,
}: Props) {
  const step = width + gap;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 30 }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: -120,
            left: i * step - 60,
            width,
            height: 400,
            backgroundColor: color,
            opacity,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({});
