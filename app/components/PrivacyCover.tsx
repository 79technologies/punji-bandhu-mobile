import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '../../src/theme/tokens';

// Shown the instant the app stops being the foreground app (app switcher,
// home button, notification shade) so the OS never gets a clean snapshot of
// the holdings screen to use as the recent-apps thumbnail. See ADR 0002.
export default function PrivacyCover() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.cover}>
        <Text style={styles.wordmark}>Punji Bandhu</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...type.h1,
    color: colors.gold500,
  },
});
