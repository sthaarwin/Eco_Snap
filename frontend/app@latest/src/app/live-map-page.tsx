import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

const hotspots = [
  { id: 'H-14', severity: 'high', x: '72%', y: '30%' },
  { id: 'H-09', severity: 'medium', x: '36%', y: '48%' },
  { id: 'H-03', severity: 'low', x: '52%', y: '70%' },
];

export default function LiveMapPageScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Live Impact Map</Text>
        <Text style={styles.subtitle}>
          Real-time field telemetry from scout submissions and sensor stations.
        </Text>

        <View style={styles.mapCard}>
          <View style={styles.gridOverlay}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`line-${index}`} style={[styles.gridLine, { top: `${index * 20}%` }]} />
            ))}
          </View>

          {hotspots.map((spot) => (
            <View
              key={spot.id}
              style={[
                styles.hotspot,
                {
                  left: spot.x,
                  top: spot.y,
                  backgroundColor:
                    spot.severity === 'high'
                      ? '#ef4444'
                      : spot.severity === 'medium'
                        ? '#f59e0b'
                        : '#22c55e',
                },
              ]}
            />
          ))}

          <Text style={styles.mapLabel}>Sector 7 Network</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>High risk</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>Watch</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Stable</Text>
          </View>
        </View>

        <View style={styles.feedCard}>
          <Text style={styles.feedTitle}>Live Feed</Text>
          <Text style={styles.feedItem}>H-14 methane spike detected. Council pinged.</Text>
          <Text style={styles.feedItem}>New scout report tagged: river plastic cluster.</Text>
          <Text style={styles.feedItem}>Weather update: mild winds, ideal mission window.</Text>
        </View>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryText}>Open Mission Queue</Text>
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
  title: {
    color: EcoColors.text,
    fontSize: 30,
    fontWeight: '800',
    marginTop: EcoSpacing.sm,
  },
  subtitle: {
    color: EcoColors.textMuted,
    lineHeight: 22,
  },
  mapCard: {
    height: 280,
    borderRadius: EcoRadius.xl,
    backgroundColor: '#dff4e6',
    borderWidth: 1,
    borderColor: EcoColors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 110, 47, 0.14)',
  },
  hotspot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: EcoRadius.pill,
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapLabel: {
    position: 'absolute',
    left: EcoSpacing.md,
    bottom: EcoSpacing.md,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: EcoRadius.pill,
    paddingHorizontal: EcoSpacing.sm,
    paddingVertical: 5,
    color: EcoColors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: EcoSpacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: EcoColors.surface,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.pill,
    paddingVertical: 6,
    paddingHorizontal: EcoSpacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: EcoRadius.pill,
  },
  legendText: {
    color: EcoColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  feedCard: {
    borderRadius: EcoRadius.lg,
    borderColor: EcoColors.border,
    borderWidth: 1,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
  },
  feedTitle: {
    color: EcoColors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  feedItem: {
    color: EcoColors.textMuted,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: EcoColors.primary,
    borderRadius: EcoRadius.lg,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
