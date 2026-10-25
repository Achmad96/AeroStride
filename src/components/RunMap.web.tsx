import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts } from '../theme';

export function RunMap({ style }: { points?: any; follow?: boolean; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.map, style, styles.webPlaceholder]}>
        <Text style={styles.webText}>Map not available on web</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 200 },
  webPlaceholder: { backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center' },
  webText: { color: '#666', fontFamily: fonts.medium },
});
