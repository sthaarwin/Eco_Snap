import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';

type Submission = {
  id: string;
  mission_id: string;
  user_id: string;
  image_url: string;
  confidence_score: number | null;
  verification_status: string;
  created_at: string;
  profiles?: { username: string };
  missions?: { title: string; narrative: string };
};

type VoteCount = {
  total: number;
  approvals: number;
  disapprovals: number;
  userVote?: 'like' | 'dislike' | 'none';
};

const supabaseUrl = 'https://omrqdxvgkxqikkorsnwx.supabase.co';
const COUNCIL_VOTE_THRESHOLD = 5;

function ActionButton({
  iconName,
  primary,
  count,
  selected,
  disabled,
  onPress,
}: {
  iconName: 'thumbs-up' | 'thumbs-down';
  primary?: boolean;
  count: number;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (disabled) return;

    Animated.sequence([
      Animated.timing(anim, { toValue: -8, duration: 120, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();

    onPress();
  };

  return (
    <View style={styles.actionColumn}>
      <Pressable
        onPress={handlePress}
        style={[
          primary ? styles.primaryButton : styles.secondaryButton,
          { width: '100%' },
          selected ? styles.selectedButton : null,
          disabled ? styles.disabledButton : null,
        ]}
        accessibilityRole="button"
        disabled={disabled}>
        <Animated.View style={{ transform: [{ translateY: anim }], alignItems: 'center' }}>
          <Ionicons name={iconName} size={20} color={primary ? '#fff' : EcoColors.text} />
        </Animated.View>
      </Pressable>
      <Text style={styles.counterText}>{count}/{COUNCIL_VOTE_THRESHOLD}</Text>
    </View>
  );
}

export default function CouncilPageScreen() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteCount>>({});
  const [loading, setLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const fetchVoteCount = useCallback(async (submissionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const { data, error } = await supabase
      .from('votes')
      .select('vote, voter_id')
      .eq('submission_id', submissionId);

    if (!error && data) {
      const approvals = data.filter((v) => v.vote).length;
      const disapprovals = data.filter((v) => !v.vote).length;
      let userVote: 'like' | 'dislike' | 'none' = 'none';
      if (userId) {
        const found = data.find(v => v.voter_id === userId);
        if (found) {
          userVote = found.vote ? 'like' : 'dislike';
        }
      }

      setVoteCounts((prev) => ({
        ...prev,
        [submissionId]: { total: data.length, approvals, disapprovals, userVote },
      }));
    }
  }, []);

  const fetchSubmissions = useCallback(async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('mission_submissions')
      .select('*, profiles(username), missions(title, narrative)')
      .in('verification_status', ['needs_review', 'pending'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubmissions(data as unknown as Submission[]);
      data.forEach((s: Submission) => {
        void fetchVoteCount(s.id);
      });
    }

    if (showLoading) {
      setLoading(false);
    }
  }, [fetchVoteCount]);

  useEffect(() => {
    void fetchSubmissions();

    const channel = supabase
      .channel('council-review-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_submissions' },
        () => {
          void fetchSubmissions({ showLoading: false });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          const changedVote = (payload.new || payload.old) as { submission_id?: string };
          if (changedVote.submission_id) {
            void fetchVoteCount(changedVote.submission_id);
          }
          void fetchSubmissions({ showLoading: false });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchSubmissions, fetchVoteCount]);

  const castVote = async (submissionId: string, approve: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    setVoteCounts((prev) => {
      const current = prev[submissionId] || { total: 0, approvals: 0, disapprovals: 0, userVote: 'none' };
      return {
        ...prev,
        [submissionId]: {
          ...current,
          userVote: approve ? 'like' : 'dislike',
        }
      };
    });

    const res = await fetch(
      `${supabaseUrl}/functions/v1/vote-engine/vote`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ submission_id: submissionId, vote: approve }),
      },
    );

    if (res.ok) {
      fetchSubmissions({ showLoading: false });
    } else {
      const errorData = await res.json().catch(() => ({}));
      import('react-native').then(({ Alert }) => {
        Alert.alert('Vote Failed', errorData.error || 'You might not be a Council member, or an error occurred.');
      });
      // Revert optimistic update
      fetchVoteCount(submissionId);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.header}>Loading submissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Community Verification</Text>
        <Text style={styles.subheader}>
          Evaluate peer findings to keep mission intelligence trusted and actionable.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Reviews</Text>
            <Text style={styles.statValue}>{submissions.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Your Accuracy</Text>
            <Text style={styles.statValue}>98%</Text>
          </View>
        </View>

        {submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>All caught up! No submissions need review.</Text>
          </View>
        ) : (
          submissions.map((item) => {
            const vc = voteCounts[item.id] ?? { total: 0, approvals: 0, disapprovals: 0, userVote: 'none' };

            const isUrgent = (item.confidence_score ?? 0) < 0.7;

            return (
              <View style={styles.card} key={item.id}>
                <View style={styles.imageWrap}>
                  <Image source={{ uri: item.image_url }} style={styles.image} />
                  <Pressable
                    style={styles.zoomButton}
                    accessibilityRole="button"
                    accessibilityLabel="Zoom image"
                    onPress={() => setZoomImage(item.image_url)}>
                    <Ionicons name="expand" size={18} color="#fff" />
                  </Pressable>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {item.missions?.title || 'Unknown Mission Access'}
                      </Text>
                      <Text style={styles.cardNarrative} numberOfLines={2}>
                        {item.missions?.narrative || 'Objective unclear. Adjudicate based on evidence.'}
                      </Text>
                      <Text style={styles.cardMeta}>
                        Scout: {item.profiles?.username || 'Unknown'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.urgencyTag,
                        isUrgent ? styles.urgencyDanger : styles.urgencyLow,
                      ]}>
                      {isUrgent ? 'URGENT' : 'LOW'}
                    </Text>
                  </View>

                  <Text style={styles.cardMeta}>
                    AI Confidence: {Math.round((item.confidence_score ?? 0) * 100)}%
                  </Text>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.round((item.confidence_score ?? 0) * 100)}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.actionRow}>
                    <ActionButton
                      iconName="thumbs-down"
                      count={vc.disapprovals}
                      selected={vc.userVote === 'dislike'}
                      disabled={vc.userVote === 'like'}
                      onPress={() => castVote(item.id, false)}
                    />
                    <ActionButton
                      iconName="thumbs-up"
                      primary
                      count={vc.approvals}
                      selected={vc.userVote === 'like'}
                      disabled={vc.userVote === 'dislike'}
                      onPress={() => castVote(item.id, true)}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!zoomImage} transparent animationType="fade" onRequestClose={() => setZoomImage(null)}>
        <View style={styles.zoomBackdrop}>
          <Pressable style={styles.zoomClose} onPress={() => setZoomImage(null)} accessibilityRole="button">
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>

          {zoomImage ? <Image source={{ uri: zoomImage }} style={styles.zoomImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
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
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EcoSpacing.lg,
  },
  header: {
    fontSize: 30,
    fontWeight: '800',
    color: EcoColors.text,
    marginTop: EcoSpacing.sm,
  },
  subheader: {
    color: EcoColors.textMuted,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: EcoColors.surface,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.lg,
    padding: EcoSpacing.md,
    gap: 4,
  },
  statLabel: {
    color: EcoColors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    color: EcoColors.primary,
    fontSize: 26,
    fontWeight: '800',
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
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: EcoColors.surface,
    borderRadius: EcoRadius.lg,
    borderWidth: 1,
    borderColor: EcoColors.border,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 190,
  },
  zoomButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 22, 16, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  cardBody: {
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: EcoSpacing.sm,
  },
  cardTitle: {
    color: EcoColors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardNarrative: {
    color: EcoColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  cardMeta: {
    color: EcoColors.textMuted,
    fontSize: 13,
  },
  urgencyTag: {
    borderRadius: EcoRadius.pill,
    paddingHorizontal: EcoSpacing.sm,
    paddingVertical: 5,
    fontWeight: '700',
    fontSize: 11,
    overflow: 'hidden',
  },
  urgencyLow: {
    color: EcoColors.primary,
    backgroundColor: '#e9f8ee',
  },
  urgencyDanger: {
    color: EcoColors.danger,
    backgroundColor: '#ffecec',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: EcoRadius.pill,
    backgroundColor: '#e6e8ea',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: EcoColors.primarySoft,
  },
  actionRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
  },
  actionColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  counterText: {
    marginTop: 6,
    color: EcoColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: EcoRadius.md,
    backgroundColor: EcoColors.primary,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: EcoRadius.md,
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surface,
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: EcoColors.primarySoft,
  },
  disabledButton: {
    opacity: 0.55,
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: EcoSpacing.md,
  },
  zoomImage: {
    width: '100%',
    height: '85%',
  },
  zoomClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
