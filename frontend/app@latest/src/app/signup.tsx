import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert } from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        Alert.alert('Success', 'Account created! Please check your email for verification if required.');
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.message || 'An unexpected error occurred');
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
          <Text style={styles.subtitle}>Join the mission to restore and protect our planet.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Join the Evolution</Text>

          <TextInput
            placeholder="Full Name"
            placeholderTextColor={EcoColors.textMuted}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
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
            placeholder="Enter Password"
            placeholderTextColor={EcoColors.textMuted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor={EcoColors.textMuted}
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/" style={styles.footerLink}>
              Login
            </Link>
          </View>
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
    padding: EcoSpacing.lg,
    justifyContent: 'center',
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
    maxWidth: 320,
  },
  card: {
    backgroundColor: EcoColors.surface,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.xl,
    padding: EcoSpacing.lg,
    gap: EcoSpacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: EcoColors.text,
    textAlign: 'center',
  },
  input: {
    backgroundColor: EcoColors.surfaceMuted,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.md,
    color: EcoColors.text,
    paddingHorizontal: EcoSpacing.md,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: EcoColors.primary,
    borderRadius: EcoRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
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
