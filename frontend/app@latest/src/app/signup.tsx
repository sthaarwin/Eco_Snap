import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoMark}>eco</Text>
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

          <Pressable style={styles.primaryButton} onPress={() => router.push('/live-map-page')}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/" style={styles.footerLink}>
              Log In
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
  logoMark: {
    color: EcoColors.primary,
    fontSize: 36,
    fontWeight: '700',
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
