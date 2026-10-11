import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF',
  card: '#F1F3F5',
  text: '#0B0F14',
  subtext: '#4A5563',
  border: '#C9CED6',
  primary: '#0A7F3F',
  onPrimary: '#FFFFFF',
  danger: '#C62828',
  onDanger: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#0B0F14',
  card: '#1A2028',
  text: '#FFFFFF',
  subtext: '#AEB7C4',
  border: '#3A4452',
  primary: '#3DDC84',
  onPrimary: '#04210F',
  danger: '#FF6B6B',
  onDanger: '#2B0000',
};

export type Theme = typeof light & { scheme: 'light' | 'dark' };

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...(scheme === 'dark' ? dark : light), scheme };
}

