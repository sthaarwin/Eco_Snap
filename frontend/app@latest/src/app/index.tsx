import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace('/live-map-page');
    } catch (error: any) {
      console.error('Login Error Detail:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>🍃</Text>
          </View>
          <Text style={styles.logoText}>EcoSnap</Text>
          <Text style={styles.subtitle}>Initialize environmental monitoring node</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Scout</Text>

          <TextInput
            placeholder="Email Address"
            placeholderTextColor={EcoColors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor={EcoColors.textMuted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.rowBetween}>
            <View style={styles.rememberRow}>
              <Switch
                value={remember}
                onValueChange={setRemember}
                trackColor={{ false: '#d0d6d0', true: '#8cdca5' }}
                thumbColor={remember ? EcoColors.primary : '#f4f4f4'}
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </View>
            <Text style={styles.linkInline}>Forgot Password?</Text>
          </View>

          <Pressable
            style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Login</Text>
            )}
          </Pressable>

          <Pressable style={styles.socialButton}>
            <View style={styles.socialRow}>
              <Image
                source={{
                  uri: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png',
                }}
                style={styles.googleLogo}
              />
              <Text style={styles.socialText}>Continue with Google</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: EcoColors.background,
  },
  decorTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: EcoRadius.pill,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    top: -120,
    left: -90,
  },
  decorBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: EcoRadius.pill,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    bottom: -120,
    right: -90,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: EcoSpacing.lg,
    gap: EcoSpacing.lg,
  },
  logoWrap: {
    alignItems: 'center',
    gap: EcoSpacing.sm,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: EcoRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9f8ee',
  },
  logoBadgeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  logoText: {
    color: EcoColors.primary,
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: EcoColors.textMuted,
    textAlign: 'center',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.xl,
    padding: EcoSpacing.lg,
    gap: EcoSpacing.md,
  },
  title: {
    color: EcoColors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  input: {
    backgroundColor: EcoColors.surfaceMuted,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.md,
    color: EcoColors.text,
    paddingVertical: 14,
    paddingHorizontal: EcoSpacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: EcoSpacing.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: EcoSpacing.xs,
  },
  rememberText: {
    color: EcoColors.textMuted,
    fontSize: 12,
  },
  linkInline: {
    color: EcoColors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: EcoColors.primary,
    borderRadius: EcoRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: EcoColors.border,
    borderRadius: EcoRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: EcoColors.surface,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: EcoSpacing.sm,
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  socialText: {
    color: EcoColors.text,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: EcoSpacing.sm,
  },
  footerText: {
    color: EcoColors.textMuted,
  },
  footerLink: {
    color: EcoColors.primary,
    fontWeight: '700',
  },
});
