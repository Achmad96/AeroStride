import { useColorScheme } from 'react-native';

export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extraBold: 'Montserrat_800ExtraBold',
};

const light = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#64748B',
  border: '#E2E8F0',
  primary: '#059669',
  onPrimary: '#FFFFFF',
  danger: '#EF4444',
  onDanger: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#0B0D13',
  card: '#151922',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  border: '#262D3D',
  primary: '#10B981',
  onPrimary: '#04210F',
  danger: '#F87171',
  onDanger: '#450A0A',
};

export type Theme = typeof light & { scheme: 'light' | 'dark'; fonts: typeof fonts };

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...(scheme === 'dark' ? dark : light), scheme, fonts };
}
