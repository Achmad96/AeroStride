import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  label: string;
  value: string;
  unit?: string;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Stat({ label, value, unit, big, style }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: t.card }, style]}>
      <Text style={[styles.label, { color: t.subtext }]}>{label}</Text>
      <Text
        style={[styles.value, { color: t.text, fontSize: big ? 48 : 28 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {unit ? <Text style={[styles.unit, { color: t.subtext }]}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontWeight: '600' },
});

