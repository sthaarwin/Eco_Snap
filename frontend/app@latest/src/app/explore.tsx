import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';

type ProfileRank = {
  id: string;
  username: string;
  xp: number;
  level: number;
  role: string | null;
  avatar_url?: string;
};

export default function ExploreScreen() {
  const [rankings, setRankings] = useState<ProfileRank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRankings = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, xp, level, role')
      .order('xp', { ascending: false })
      .limit(50);

    if (!error && data) {
      setRankings(data as ProfileRank[]);
    }
  }, []);

  useEffect(() => {
    fetchRankings().finally(() => setIsLoading(false));
  }, [fetchRankings]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchRankings();
    setIsRefreshing(false);
  };

  const renderRankingItem = ({ item, index }: { item: ProfileRank; index: number }) => {
    // Skip top 3 for the list as they are in the podium
    if (index < 3) return null;

    return (
      <View style={styles.rankItem}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
        </View>
        <View style={styles.rankInfo}>
          <Text style={styles.rankName}>{item.username || 'Anonymous Scout'}</Text>
          <Text style={styles.rankRole}>{item.role?.toUpperCase() || 'SCOUT'} • LVL {item.level}</Text>
        </View>
        <View style={styles.rankXpContainer}>
          <Text style={styles.rankXpValue}>{item.xp}</Text>
          <Text style={styles.rankXpLabel}>XP</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={EcoColors.primary} size="large" />
          <Text style={styles.loadingText}>Fetching Global Rankings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const top3 = rankings.slice(0, 3);
  const remaining = rankings; // FlatList handles the index < 3 check

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Rankings</Text>
        <Text style={styles.subtitle}>Top environmental scouts across the grid.</Text>
      </View>

      <FlatList
        data={remaining}
        keyExtractor={(item) => item.id}
        renderItem={renderRankingItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={EcoColors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.podiumContainer}>
              {/* Second Place */}
              {top3[1] && (
                <View style={[styles.podiumSpot, styles.podiumSecond]}>
                  <View style={styles.podiumAvatarWrap}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#E2E8F0' }]}>
                      <Text style={styles.avatarInitial}>{top3[1].username[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.podiumBadge}>
                      <Text style={styles.podiumBadgeText}>2</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[1].username}</Text>
                  <Text style={styles.podiumXp}>{top3[1].xp} XP</Text>
                  <View style={[styles.podiumBase, { height: 60, backgroundColor: '#cbd5e1' }]} />
                </View>
              )}

              {/* First Place */}
              {top3[0] && (
                <View style={[styles.podiumSpot, styles.podiumFirst]}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" style={styles.trophyIcon} />
                  <View style={styles.podiumAvatarWrap}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 2 }]}>
                      <Text style={[styles.avatarInitial, { color: '#F59E0B' }]}>{top3[0].username[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.podiumBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.podiumBadgeText}>1</Text>
                    </View>
                  </View>
                  <Text style={[styles.podiumName, { fontWeight: '800' }]} numberOfLines={1}>{top3[0].username}</Text>
                  <Text style={[styles.podiumXp, { color: '#F59E0B' }]}>{top3[0].xp} XP</Text>
                  <View style={[styles.podiumBase, { height: 90, backgroundColor: '#f59e0b' }]} />
                </View>
              )}

              {/* Third Place */}
              {top3[2] && (
                <View style={[styles.podiumSpot, styles.podiumThird]}>
                  <View style={styles.podiumAvatarWrap}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#FFEDD5' }]}>
                      <Text style={styles.avatarInitial}>{top3[2].username[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.podiumBadge, { backgroundColor: '#92400E' }]}>
                      <Text style={styles.podiumBadgeText}>3</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[2].username}</Text>
                  <Text style={styles.podiumXp}>{top3[2].xp} XP</Text>
                  <View style={[styles.podiumBase, { height: 40, backgroundColor: '#92400e' }]} />
                </View>
              )}
            </View>
            <View style={styles.divider} />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No scouts ranked yet. Be the first!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: EcoColors.background,
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
  header: {
    padding: EcoSpacing.lg,
    paddingBottom: EcoSpacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: EcoColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: EcoColors.textMuted,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: EcoSpacing.lg,
    paddingBottom: EcoSpacing.xl,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: EcoSpacing.lg,
    marginBottom: EcoSpacing.lg,
    height: 220,
  },
  podiumSpot: {
    alignItems: 'center',
    width: '30%',
  },
  podiumFirst: {
    zIndex: 2,
    marginHorizontal: -10,
  },
  podiumSecond: {
    zIndex: 1,
  },
  podiumThird: {
    zIndex: 1,
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '800',
    color: '#475569',
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  podiumBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: EcoColors.text,
    textAlign: 'center',
  },
  podiumXp: {
    fontSize: 11,
    color: EcoColors.textMuted,
    marginBottom: 8,
  },
  podiumBase: {
    width: '90%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  trophyIcon: {
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: EcoColors.border,
    marginVertical: EcoSpacing.md,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: EcoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: EcoColors.border,
  },
  rankBadge: {
    width: 30,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: EcoColors.textMuted,
  },
  rankInfo: {
    flex: 1,
    marginLeft: EcoSpacing.md,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
    color: EcoColors.text,
  },
  rankRole: {
    fontSize: 11,
    color: EcoColors.textMuted,
    fontWeight: '600',
  },
  rankXpContainer: {
    alignItems: 'flex-end',
  },
  rankXpValue: {
    fontSize: 16,
    fontWeight: '800',
    color: EcoColors.primary,
  },
  rankXpLabel: {
    fontSize: 10,
    color: EcoColors.textMuted,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: EcoSpacing.xl,
  },
  emptyText: {
    color: EcoColors.textMuted,
    fontStyle: 'italic',
  },
});
