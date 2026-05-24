import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'index' || segments[0] === 'signup';

    if (!user && !inAuthGroup) {
      router.replace('/');
    } else if (user && inAuthGroup) {
      router.replace('/live-map-page');
    }
  }, [user, isLoading, segments]);

  const isAuthRoute = segments[0] === 'index' || segments[0] === 'signup';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isAuthRoute ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <AppTabs />
      )}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
