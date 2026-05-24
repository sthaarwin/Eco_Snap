import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

type XpTransaction = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

type ProfileStats = {
  submissionCount: number;
  approvedSubmissionCount: number;
  rankPosition: number | null;
  totalProfiles: number;
};

const XP_PER_LEVEL = 500;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ES';
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes} MIN AGO`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'} AGO`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;

  return new Date(value).toLocaleDateString();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    submissionCount: 0,
    approvedSubmissionCount: 0,
    rankPosition: null,
    totalProfiles: 0,
  });
  const [xpTransactions, setXpTransactions] = useState<XpTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    const [
      profileResult,
      submissionsResult,
      approvedSubmissionsResult,
      xpTransactionsResult,
      rankingResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('mission_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('mission_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('verification_status', 'approved'),
      supabase
        .from('xp_transactions')
        .select('id, amount, reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('profiles').select('id, xp').order('xp', { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (submissionsResult.error) throw submissionsResult.error;
    if (approvedSubmissionsResult.error) throw approvedSubmissionsResult.error;
    if (xpTransactionsResult.error) throw xpTransactionsResult.error;
    if (rankingResult.error) throw rankingResult.error;

    const ranking = rankingResult.data ?? [];
    const rankIndex = ranking.findIndex((item) => item.id === user.id);

    setProfile(profileResult.data);
    setStats({
      submissionCount: submissionsResult.count ?? 0,
      approvedSubmissionCount: approvedSubmissionsResult.count ?? 0,
      rankPosition: rankIndex >= 0 ? rankIndex + 1 : null,
      totalProfiles: ranking.length,
    });
    setXpTransactions(xpTransactionsResult.data ?? []);
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    loadProfile()
      .catch((error) => {
        console.error('Profile load error:', error);
        Alert.alert('Profile Error', error instanceof Error ? error.message : 'Unable to load profile');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadProfile]);

  const refreshProfile = async () => {
    setIsRefreshing(true);
    try {
      await loadProfile();
    } catch (error) {
      console.error('Profile refresh error:', error);
      Alert.alert('Profile Error', error instanceof Error ? error.message : 'Unable to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayName = profile?.username || user?.email || 'EcoSnap Scout';
  const initials = getInitials(displayName);
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const currentLevelStart = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  const levelProgress = Math.min(100, Math.max(0, ((xp - currentLevelStart) / XP_PER_LEVEL) * 100));
  const accuracy = stats.submissionCount > 0
    ? Math.round((stats.approvedSubmissionCount / stats.submissionCount) * 1000) / 10
    : null;
  const rankSummary = useMemo(() => {
    if (!stats.rankPosition || !stats.totalProfiles) return 'Rank pending';

    const percentile = Math.max(1, Math.ceil((stats.rankPosition / stats.totalProfiles) * 100));
    return `Top ${percentile}% of Regional Stewards`;
  }, [stats.rankPosition, stats.totalProfiles]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={EcoColors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshProfile()} />
        }>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.rank}>LEVEL {level} {profile?.role?.toUpperCase() ?? 'SCOUT'}</Text>
            <Text style={styles.subtitle}>{rankSummary}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Next Level</Text>
            <Text style={styles.progressLabel}>{xp} / {nextLevelXp} XP</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>IMPACT SCORE</Text>
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statHint}>Total earned XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MISSIONS</Text>
            <Text style={styles.statValue}>{stats.submissionCount}</Text>
            <Text style={styles.statHint}>{stats.approvedSubmissionCount} approved submissions</Text>
          </View>
        </View>

        <View style={styles.accuracyCard}>
          <Text style={styles.statLabel}>ACCURACY</Text>
          <Text style={styles.accuracyValue}>{accuracy === null ? '--' : `${accuracy}%`}</Text>
          <Text style={styles.statHint}>Approved submission rate</Text>
        </View>

        <Text style={styles.timelineTitle}>Mission History</Text>
        {xpTransactions.length > 0 ? (
          xpTransactions.map((item) => (
            <View style={styles.timelineCard} key={item.id}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineItemTitle}>{item.reason}</Text>
                <Text style={styles.timelineWhen}>{formatRelativeTime(item.created_at)}</Text>
              </View>
              <Text style={styles.timelineDetails}>XP transaction recorded in EcoSnap.</Text>
              <Text style={styles.timelineChip}>
                {item.amount >= 0 ? '+' : ''}{item.amount} XP
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.timelineCard}>
            <Text style={styles.timelineItemTitle}>No mission history yet</Text>
            <Text style={styles.timelineDetails}>
              Complete and verify missions to build your activity history.
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleLogout()}
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: EcoSpacing.sm,
  },
  loadingText: {
    color: EcoColors.textMuted,
    fontWeight: '600',
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
