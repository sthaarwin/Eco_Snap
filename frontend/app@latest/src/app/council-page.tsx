import { useState, useRef } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

type Verification = {
  id: string;
  title: string;
  scout: string;
  urgency: 'LOW' | 'URGENT';
  confidence: number;
  image: string;
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

export default function CouncilPageScreen() {
  const [items, setItems] = useState(initialItems);
  
  function ActionButton({
    iconName,
    primary,
    initial = 0,
  }: {
    iconName: string;
    primary?: boolean;
    initial?: number;
  }) {
    const [count, setCount] = useState<number>(initial);
    const anim = useRef(new Animated.Value(0)).current;

    const handlePress = () => {
      // increment until 20
      setCount((c) => Math.min(20, c + 1));
      Animated.sequence([
        Animated.timing(anim, { toValue: -8, duration: 120, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    };

    return (
      <View style={styles.actionColumn}>
        <Pressable
          onPress={handlePress}
          style={[primary ? styles.primaryButton : styles.secondaryButton, { width: '100%' }]}
          accessibilityRole="button">
          <Animated.View style={{ transform: [{ translateY: anim }] }}>
            <Ionicons
              name={iconName as any}
              size={20}
              color={primary ? '#fff' : EcoColors.text}
            />
          </Animated.View>
        </Pressable>
        <Text style={styles.counterText}>{count}/20</Text>
      </View>
    );
  }

  const complete = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
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

        {items.map((item) => (
          <View style={styles.card} key={item.id}>
            <Image source={{ uri: item.image }} style={styles.image} />
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
                <ActionButton iconName="thumbs-down" />
                <ActionButton iconName="thumbs-up" primary />
              </View>
            </View>
          </View>
        ))}
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
  image: {
    width: '100%',
    height: 190,
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
    paddingVertical: 12,
    borderRadius: EcoRadius.md,
    backgroundColor: EcoColors.primary,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: EcoRadius.md,
    borderWidth: 1,
    borderColor: EcoColors.border,
  },
  secondaryText: {
    color: EcoColors.text,
    fontWeight: '600',
  },
});
