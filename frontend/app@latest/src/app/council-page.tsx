import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

type Verification = {
  id: string;
  title: string;
  scout: string;
  urgency: 'LOW' | 'URGENT';
  confidence: number;
  image: string;
};

type VoteState = {
  likes: number;
  dislikes: number;
  vote: 'none' | 'like' | 'dislike';
};

const initialItems: Verification[] = [
  {
    id: '1',
    title: 'Mangrove Restoration Bloom',
    scout: 'Scout #8821',
    urgency: 'LOW',
    confidence: 92,
    image:
      'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: '2',
    title: 'Secondary Aquifer Depletion',
    scout: 'Scout #1405',
    urgency: 'URGENT',
    confidence: 64,
    image:
      'https://images.unsplash.com/photo-1613503438817-2f7ab8f2e8a3?auto=format&fit=crop&w=1200&q=80',
  },
];

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
      <Text style={styles.counterText}>{count}/20</Text>
    </View>
  );
}

export default function CouncilPageScreen() {
  const [items, setItems] = useState(initialItems);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteState>>(() => {
    const initialVotes: Record<string, VoteState> = {};
    initialItems.forEach((item) => {
      initialVotes[item.id] = { likes: 0, dislikes: 0, vote: 'none' };
    });
    return initialVotes;
  });

  const complete = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleVote = (id: string, type: 'like' | 'dislike') => {
    setVotes((prev) => {
      const current = prev[id] ?? { likes: 0, dislikes: 0, vote: 'none' as const };

      if (type === 'like') {
        if (current.vote === 'like') {
          return {
            ...prev,
            [id]: { ...current, likes: Math.max(0, current.likes - 1), vote: 'none' },
          };
        }

        return {
          ...prev,
          [id]: {
            likes: Math.min(20, current.likes + 1),
            dislikes: current.vote === 'dislike' ? Math.max(0, current.dislikes - 1) : current.dislikes,
            vote: 'like',
          },
        };
      }

      if (current.vote === 'dislike') {
        return {
          ...prev,
          [id]: { ...current, dislikes: Math.max(0, current.dislikes - 1), vote: 'none' },
        };
      }

      return {
        ...prev,
        [id]: {
          likes: current.vote === 'like' ? Math.max(0, current.likes - 1) : current.likes,
          dislikes: Math.min(20, current.dislikes + 1),
          vote: 'dislike',
        },
      };
    });
  };

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
            <Text style={styles.statValue}>{items.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Your Accuracy</Text>
            <Text style={styles.statValue}>98%</Text>
          </View>
        </View>

        {items.map((item) => {
          const vote = votes[item.id] ?? { likes: 0, dislikes: 0, vote: 'none' as const };

          return (
            <View style={styles.card} key={item.id}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <Pressable
                  style={styles.zoomButton}
                  accessibilityRole="button"
                  accessibilityLabel="Zoom image"
                  onPress={() => setZoomImage(item.image)}>
                  <Ionicons name="expand" size={18} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>{item.scout}</Text>
                  </View>
                  <Text
                    style={[
                      styles.urgencyTag,
                      item.urgency === 'URGENT' ? styles.urgencyDanger : styles.urgencyLow,
                    ]}>
                    {item.urgency}
                  </Text>
                </View>

                <Text style={styles.cardMeta}>AI Confidence: {item.confidence}%</Text>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${item.confidence}%` }]} />
                </View>

                <View style={styles.actionRow}>
                  <ActionButton
                    iconName="thumbs-down"
                    count={vote.dislikes}
                    selected={vote.vote === 'dislike'}
                    disabled={vote.vote === 'like'}
                    onPress={() => handleVote(item.id, 'dislike')}
                  />
                  <ActionButton
                    iconName="thumbs-up"
                    primary
                    count={vote.likes}
                    selected={vote.vote === 'like'}
                    disabled={vote.vote === 'dislike'}
                    onPress={() => handleVote(item.id, 'like')}
                  />
                </View>

                <Pressable style={styles.completeButton} onPress={() => complete(item.id)}>
                  <Text style={styles.completeText}>Mark as Completed</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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
  completeButton: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: EcoRadius.md,
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surfaceMuted,
  },
  completeText: {
    color: EcoColors.text,
    fontWeight: '600',
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
