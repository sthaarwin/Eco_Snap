import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EcoColors, EcoSpacing } from '@/constants/ecosnap-theme';

const tabItems = [
  { route: 'live-map-page', label: 'Map', icon: 'map' as const },
  { route: 'mission-brief', label: 'Missions', icon: 'clipboard-text-outline' as const },
  { route: 'scan', label: 'Scan', icon: 'qrcode-scan' as const, center: true },
  { route: 'council-page', label: 'Council', icon: 'account-group-outline' as const },
  { route: 'profile', label: 'Profile', icon: 'account-outline' as const },
];

function EcoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.barShell, { paddingBottom: bottomInset }]}>
      <View style={styles.bar}>
        {tabItems.map((item) => {
          const isCenter = Boolean(item.center);
          const routeIndex = state.routes.findIndex((route) => route.name === item.route);
          const isFocused = routeIndex >= 0 && state.index === routeIndex;

          if (isCenter) {
            return (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => router.push('/scan' as never)}
                style={({ pressed }) => [styles.centerItem, pressed && styles.pressed]}>
                <View style={styles.centerButton}>
                  <MaterialCommunityIcons name={item.icon} size={28} color="#fff" />
                </View>
                <Text style={[styles.label, styles.centerLabel]}>{item.label}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={item.label}
              onPress={() => {
                if (routeIndex < 0) {
                  return;
                }

                const event = navigation.emit({
                  type: 'tabPress',
                  target: state.routes[routeIndex].key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(item.route);
                }
              }}
              style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={isFocused ? EcoColors.primary : EcoColors.textMuted}
              />
              <Text style={[styles.label, isFocused ? styles.activeLabel : styles.inactiveLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <EcoTabBar {...props} />}>
      <Tabs.Screen name="live-map-page" options={{ title: 'Map' }} />
      <Tabs.Screen name="mission-brief" options={{ title: 'Missions' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="council-page" options={{ title: 'Council' }} />
      <Tabs.Screen name="leaderboard" options={{ href: null, title: 'Leaderboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barShell: {
    paddingHorizontal: EcoSpacing.md,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: EcoColors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(10, 22, 16, 0.08)',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    shadowColor: '#0a120f',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minHeight: 58,
  },
  centerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minHeight: 78,
  },
  centerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EcoColors.primarySoft,
    borderWidth: 6,
    borderColor: EcoColors.surface,
    marginTop: -34,
    shadowColor: EcoColors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: EcoColors.primary,
  },
  inactiveLabel: {
    color: EcoColors.textMuted,
  },
  centerLabel: {
    color: EcoColors.textMuted,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
});
