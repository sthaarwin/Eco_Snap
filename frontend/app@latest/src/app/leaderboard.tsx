import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type LeaderboardProfile = {
  id: string;
  username: string | null;
  xp: number | null;
  level: number | null;
  role: string | null;
};

const PODIUM_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ES';
}

function roleLabel(role: string | null) {
  if (!role) return 'Scout';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, xp, level, role')
      .order('xp', { ascending: false })
      .limit(50);

    if (error) throw error;
    setProfiles(data ?? []);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadLeaderboard()
      .catch((error) => {
        console.error('Leaderboard load error:', error);
        Alert.alert('Leaderboard Error', error instanceof Error ? error.message : 'Unable to load leaderboard');
      })
      .finally(() => setIsLoading(false));
  }, [loadLeaderboard]);

  const refreshLeaderboard = async () => {
    setIsRefreshing(true);
    try {
      await loadLeaderboard();
    } catch (error) {
      console.error('Leaderboard refresh error:', error);
      Alert.alert('Leaderboard Error', error instanceof Error ? error.message : 'Unable to refresh leaderboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentUserRank = useMemo(() => {
    const index = profiles.findIndex((profile) => profile.id === user?.id);
    return index >= 0 ? index + 1 : null;
  }, [profiles, user?.id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={EcoColors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshLeaderboard()} />
        }>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Leaderboard</Text>
            <Text style={styles.subheader}>Top EcoSnap stewards ranked by earned XP.</Text>
          </View>
          <View style={styles.rankBadge}>
            <MaterialCommunityIcons name="trophy" size={20} color="#fff" />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Your Rank</Text>
            <Text style={styles.summaryValue}>{currentUserRank ? `#${currentUserRank}` : '--'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Players</Text>
            <Text style={styles.summaryValue}>{profiles.length}</Text>
          </View>
        </View>

        {profiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No leaderboard entries yet.</Text>
          </View>
        ) : (
          profiles.map((profile, index) => {
            const rank = index + 1;
            const name = profile.username || 'EcoSnap Scout';
            const isCurrentUser = profile.id === user?.id;
            const podiumColor = PODIUM_COLORS[index];

            return (
              <View
                key={profile.id}
                style={[
                  styles.rowCard,
                  isCurrentUser ? styles.currentUserCard : null,
                ]}>
                <View style={[styles.rankCircle, podiumColor ? { backgroundColor: podiumColor } : null]}>
                  <Text style={styles.rankText}>{rank}</Text>
                </View>

                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(name)}</Text>
                </View>

                <View style={styles.profileText}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.meta}>
                    Level {profile.level ?? 1} {roleLabel(profile.role)}
                  </Text>
                </View>

                <View style={styles.scoreWrap}>
                  <Text style={styles.score}>{profile.xp ?? 0}</Text>
                  <Text style={styles.scoreLabel}>XP</Text>
                </View>
              </View>
            );
          })
        )}
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
    paddingBottom: EcoSpacing.xl,
    gap: EcoSpacing.md,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: EcoSpacing.sm,
  },
  loadingText: {
    color: EcoColors.textMuted,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: EcoSpacing.md,
  },
  header: {
    color: EcoColors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subheader: {
    color: EcoColors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  rankBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EcoColors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: EcoColors.surface,
    borderRadius: EcoRadius.lg,
    borderWidth: 1,
    borderColor: EcoColors.border,
    padding: EcoSpacing.md,
  },
  summaryLabel: {
    color: EcoColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: EcoColors.primary,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: EcoColors.surface,
    borderRadius: EcoRadius.lg,
    borderWidth: 1,
    borderColor: EcoColors.border,
    padding: EcoSpacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: EcoColors.textMuted,
    fontWeight: '700',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EcoColors.surface,
    borderRadius: EcoRadius.lg,
    borderWidth: 1,
    borderColor: EcoColors.border,
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
  },
  currentUserCard: {
    borderColor: EcoColors.primary,
    backgroundColor: '#edf8f0',
  },
  rankCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EcoColors.surfaceMuted,
  },
  rankText: {
    color: EcoColors.text,
    fontWeight: '900',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EcoColors.primary,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: EcoColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: EcoColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  scoreWrap: {
    alignItems: 'flex-end',
  },
  score: {
    color: EcoColors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  scoreLabel: {
    color: EcoColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
});
