import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { RunNavbarButton } from '../../src/components/RunNavbarButton';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.text,
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
          height: 64,
        },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.subtext,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size + 2} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size + 2} />,
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => <RunNavbarButton />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size + 2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size + 2} />,
        }}
      />
    </Tabs>
  );
}

