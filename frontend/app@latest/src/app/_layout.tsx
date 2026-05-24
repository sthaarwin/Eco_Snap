import { Stack, useSegments } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const segments = useSegments();
  const isAuthRoute = segments.join('/') === '' || segments[0] === 'signup';

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
