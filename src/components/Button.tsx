import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, fonts } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: Props) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.danger : t.card;
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? t.onDanger : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: t.border, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    minWidth: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontFamily: fonts.bold, letterSpacing: 0.2 },
});

