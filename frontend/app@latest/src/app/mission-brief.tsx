import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, SafeAreaView, FlatList, StyleSheet, Text, View, ActivityIndicator, Dimensions } from 'react-native';
import * as Location from 'expo-location';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';

type Hotspot = {
  id: string;
  coordinates: { lat: number; lng: number };
  status: 'active' | 'resolved';
  severity: number;
  category: string;
  mission_id: string | null;
  created_at: string;
};

// Helper for distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

const { width } = Dimensions.get('window');

export default function MissionBriefScreen() {
  const router = useRouter();
  const [missions, setMissions] = useState<(Hotspot & { distance?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('your area');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        let userLat = 28.7041;
        let userLng = 77.1025;

        // Get location permissions and current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === Location.PermissionStatus.GRANTED) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          userLat = loc.coords.latitude;
          userLng = loc.coords.longitude;

          // Try reverse geocoding
          const geocode = await Location.reverseGeocodeAsync({
            latitude: userLat,
            longitude: userLng,
          });
          if (geocode && geocode.length > 0) {
            const place = geocode[0];
            const name = place.name || place.city || place.region || place.country || 'your area';
            setLocationName(name);
          }
        }

        // Fetch active hotspots from supabase
        const { data, error } = await supabase
          .from('hotspots')
          .select('*')
          .eq('status', 'active');

        if (!error && data) {
          const hotspotsWithDistance = (data as Hotspot[]).map(h => ({
            ...h,
            distance: getDistanceFromLatLonInKm(userLat, userLng, h.coordinates.lat, h.coordinates.lng)
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

          setMissions(hotspotsWithDistance);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, []);

  const handleStartMission = () => {
    const selectedMission = missions[currentIndex];
    if (selectedMission) {
      router.push(`/live-map-page?tracking=true&missionId=${selectedMission.id}`);
    }
  };

  const handleViewDetails = () => {
    router.push('/council-page');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Local Missions</Text>
          <Text style={styles.subtitle}>Showing adaptive missions for {locationName}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={EcoColors.primary} style={{ marginTop: 40 }} />
        ) : missions.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No active missions nearby</Text>
            <Text style={styles.body}>Your area is clear of major environmental issues.</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={missions}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentIndex(index);
              }}
              renderItem={({ item: mission, index }) => (
                <View style={{ width, paddingHorizontal: EcoSpacing.lg }}>
                  <View style={styles.card}>
                    <View style={styles.badgeRow}>
                      <Text style={[styles.badge, styles.activeBadge]}>ACTIVE MISSION</Text>
                      <Text style={[styles.badge, styles.priorityBadge, mission.severity >= 4 && styles.urgentBadge]}>
                        PRIORITY {mission.severity}
                      </Text>
                    </View>

                    <Text style={styles.missionCardTitle}>
                      {mission.category ? mission.category.replace(/_/g, ' ').toUpperCase() : `Mission #${index + 1}`}
                    </Text>

                    <View style={styles.heroCard}>
                      <Image
                        source={{
                          uri: 'https://images.unsplash.com/photo-1618477460939-5a6769c15f75?auto=format&fit=crop&w=1400&q=80',
                        }}
                        style={styles.heroImage}
                      />
                      <View style={styles.overlayLabel}>
                        <Text style={styles.overlayLabelText}>
                          {mission.distance !== undefined ? `${mission.distance.toFixed(1)} km away` : 'Nearby'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.sectionTitle}>Intelligence Report</Text>
                    <Text style={styles.body}>
                      Sensor networks and scout reports indicate a severity {mission.severity} issue at this location.
                      Objective: document pollutant categories, mitigate the issue if possible, and submit a verified report to earn rewards.
                    </Text>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricBox}>
                        <Text style={styles.metricValue}>{Math.round(mission.severity * 100 + 50)}</Text>
                        <Text style={styles.metricLabel}>XP</Text>
                      </View>
                      <View style={styles.metricBox}>
                        <Text style={[styles.metricValue, { color: EcoColors.sky }]}>{mission.severity * 5}</Text>
                        <Text style={styles.metricLabel}>Impact</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            />

            <View style={styles.pagination}>
              {missions.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
              ))}
            </View>

            <View style={styles.fixedBottomBar}>
              <Pressable style={styles.primaryButton} onPress={handleStartMission}>
                <Text style={styles.primaryText}>Start Mission</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleViewDetails}>
                <Text style={styles.secondaryText}>View Details</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: EcoColors.background,
  },
  container: {
    flex: 1,
    paddingTop: EcoSpacing.lg,
  },
  header: {
    paddingHorizontal: EcoSpacing.lg,
    marginBottom: EcoSpacing.md,
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
  urgentBadge: {
    color: '#fff',
    backgroundColor: '#ef4444',
  },
  pageTitle: {
    color: EcoColors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: EcoColors.textMuted,
    lineHeight: 22,
    marginBottom: EcoSpacing.sm,
  },
  missionCardTitle: {
    color: EcoColors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: EcoSpacing.xs,
    marginBottom: EcoSpacing.sm,
    textTransform: 'capitalize',
  },
  heroCard: {
    borderRadius: EcoRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surface,
    marginBottom: EcoSpacing.sm,
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
    flex: 1,
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: EcoSpacing.md,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  activeDot: {
    backgroundColor: EcoColors.primary,
    width: 24,
  },
  fixedBottomBar: {
    padding: EcoSpacing.lg,
    paddingTop: 0,
    gap: EcoSpacing.sm,
  },
  primaryButton: {
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
