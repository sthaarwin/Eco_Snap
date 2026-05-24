import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

const timeline = [
  {
    title: 'Water Quality Audit',
    when: '2 HOURS AGO',
    details: 'Verified nitrate levels at Blue Creek Basin. Escalation sent to council.',
    points: '+25 IMPACT',
  },
  {
    title: 'Flora Classification',
    when: 'YESTERDAY',
    details: 'Tagged 3 invasive species in Central Park Zone B for mission follow-up.',
    points: '+15 IMPACT',
  },
  {
    title: 'Community Council Meet',
    when: '3 DAYS AGO',
    details: 'Proposed Green Corridor initiative with field sensor evidence.',
    points: 'INFLUENCE +10',
  },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Alex Rivera</Text>
            <Text style={styles.rank}>LEVEL 5 SCOUT</Text>
            <Text style={styles.subtitle}>Top 2% of Regional Stewards</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Next Rank: Guardian</Text>
            <Text style={styles.progressLabel}>1,240 / 2,000 XP</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>IMPACT SCORE</Text>
            <Text style={styles.statValue}>850</Text>
            <Text style={styles.statHint}>+12% from last month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MISSIONS</Text>
            <Text style={styles.statValue}>142</Text>
            <Text style={styles.statHint}>Active community actions</Text>
          </View>
        </View>

        <View style={styles.accuracyCard}>
          <Text style={styles.statLabel}>ACCURACY</Text>
          <Text style={styles.accuracyValue}>98.4%</Text>
          <Text style={styles.statHint}>Data verification rate</Text>
        </View>

        <Text style={styles.timelineTitle}>Mission History</Text>
        {timeline.map((item) => (
          <View style={styles.timelineCard} key={item.title}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineItemTitle}>{item.title}</Text>
              <Text style={styles.timelineWhen}>{item.when}</Text>
            </View>
            <Text style={styles.timelineDetails}>{item.details}</Text>
            <Text style={styles.timelineChip}>{item.points}</Text>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/signup')}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
          <Text style={styles.logoutText}>Log out</Text>
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
  hero: {
    borderRadius: EcoRadius.xl,
    borderColor: EcoColors.border,
    borderWidth: 1,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: EcoSpacing.md,
    marginTop: EcoSpacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: EcoRadius.pill,
    backgroundColor: '#d5e0f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#304460',
    fontSize: 24,
    fontWeight: '800',
  },
  name: {
    color: EcoColors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  rank: {
    color: EcoColors.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    color: EcoColors.textMuted,
    marginTop: 4,
  },
  progressWrap: {
    backgroundColor: EcoColors.surface,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.lg,
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: EcoSpacing.sm,
  },
  progressLabel: {
    color: EcoColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 9,
    backgroundColor: '#e6e8ea',
    borderRadius: EcoRadius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '62%',
    backgroundColor: EcoColors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: EcoColors.border,
    borderRadius: EcoRadius.lg,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    color: EcoColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  statValue: {
    color: EcoColors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  statHint: {
    color: EcoColors.textMuted,
    fontSize: 12,
  },
  accuracyCard: {
    borderWidth: 1,
    borderColor: EcoColors.border,
    borderRadius: EcoRadius.lg,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    gap: 4,
  },
  accuracyValue: {
    color: EcoColors.sky,
    fontSize: 32,
    fontWeight: '800',
  },
  timelineTitle: {
    color: EcoColors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: EcoColors.border,
    borderRadius: EcoRadius.lg,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: EcoSpacing.sm,
  },
  timelineItemTitle: {
    color: EcoColors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  timelineWhen: {
    color: EcoColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timelineDetails: {
    color: EcoColors.textMuted,
    lineHeight: 21,
  },
  timelineChip: {
    alignSelf: 'flex-start',
    borderRadius: EcoRadius.pill,
    backgroundColor: EcoColors.surfaceMuted,
    color: EcoColors.text,
    paddingHorizontal: EcoSpacing.sm,
    paddingVertical: 5,
    fontWeight: '700',
    fontSize: 11,
    overflow: 'hidden',
  },
  logoutButton: {
    marginTop: EcoSpacing.sm,
    borderRadius: EcoRadius.lg,
    backgroundColor: '#e34d4d',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutPressed: {
    opacity: 0.86,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
