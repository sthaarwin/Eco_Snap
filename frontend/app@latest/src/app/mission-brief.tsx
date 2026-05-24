import { useRouter } from 'expo-router';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

export default function MissionBriefScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, styles.activeBadge]}>ACTIVE MISSION</Text>
          <Text style={[styles.badge, styles.priorityBadge]}>PRIORITY 2</Text>
        </View>

        <Text style={styles.pageTitle}>Eco-Mission: Clear Sector 7</Text>

        <View style={styles.heroCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1618477460939-5a6769c15f75?auto=format&fit=crop&w=1400&q=80',
            }}
            style={styles.heroImage}
          />
          <View style={styles.overlayLabel}>
            <Text style={styles.overlayLabelText}>Riverside Trail, Sector 7</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Intelligence Report</Text>
          <Text style={styles.body}>
            Satellite scans show severe non-biodegradable waste accumulation along the northwest
            embankment. Objective: document pollutant categories, remove light debris, and submit
            a verified report to unlock council dispatch.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Expected Yield</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>450</Text>
              <Text style={styles.metricLabel}>XP</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: EcoColors.sky }]}>12</Text>
              <Text style={styles.metricLabel}>Impact</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/live-map-page')}>
          <Text style={styles.primaryText}>Start Mission</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/council-page')}>
          <Text style={styles.secondaryText}>View Details</Text>
        </Pressable>
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
    padding: EcoSpacing.lg,
    gap: EcoSpacing.md,
    paddingBottom: EcoSpacing.xl,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
    marginTop: EcoSpacing.sm,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    borderRadius: EcoRadius.pill,
    overflow: 'hidden',
    paddingHorizontal: EcoSpacing.sm,
    paddingVertical: 6,
  },
  activeBadge: {
    color: EcoColors.primary,
    backgroundColor: '#e9f8ee',
  },
  priorityBadge: {
    color: EcoColors.warning,
    backgroundColor: '#fff6e8',
  },
  pageTitle: {
    color: EcoColors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: EcoRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surface,
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  overlayLabel: {
    position: 'absolute',
    left: EcoSpacing.md,
    bottom: EcoSpacing.md,
    backgroundColor: 'rgba(25, 28, 30, 0.68)',
    borderRadius: EcoRadius.md,
    paddingHorizontal: EcoSpacing.sm,
    paddingVertical: 6,
  },
  overlayLabelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    backgroundColor: EcoColors.surface,
    borderWidth: 1,
    borderColor: EcoColors.border,
    borderRadius: EcoRadius.lg,
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
  },
  sectionTitle: {
    color: EcoColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: EcoColors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    padding: EcoSpacing.md,
    borderWidth: 1,
    borderColor: EcoColors.border,
    borderRadius: EcoRadius.md,
    backgroundColor: EcoColors.surfaceMuted,
  },
  metricValue: {
    color: EcoColors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  metricLabel: {
    color: EcoColors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  primaryButton: {
    marginTop: EcoSpacing.sm,
    backgroundColor: EcoColors.primary,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: EcoRadius.lg,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: EcoColors.border,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: EcoRadius.lg,
    backgroundColor: EcoColors.surface,
  },
  secondaryText: {
    color: EcoColors.text,
    fontWeight: '600',
  },
});
