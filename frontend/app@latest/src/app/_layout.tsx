import { Stack, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const segments = useSegments();
  const isAuthRoute = segments.join('/') === '' || segments[0] === 'signup';

  useEffect(() => {
    if (isAuthRoute) {
      return;
    }

    NavigationBar.setBackgroundColorAsync('#f7f9fb');
    NavigationBar.setButtonStyleAsync('dark');
  }, [isAuthRoute]);

  return (
    <>
      <AnimatedSplashOverlay />
      {isAuthRoute ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <AppTabs />
      )}
    </>
  );
}
