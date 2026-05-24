import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, FlatList, StyleSheet, Text, View, ActivityIndicator, Dimensions, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';
import { kMeans, Point } from '@/lib/clustering';

type Mission = {
  id: string;
  title: string;
  narrative: string;
  coordinates: { lat: number; lng: number };
  priority: number;
  status: 'active' | 'in_progress' | 'completed' | 'expired';
  weather_trigger: string | null;
  location_name: string | null;
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

// Pseudo-random generator for consistent nearby coordinates
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return () => {
    h = Math.imul(1597334677, h);
    return ((h >>> 0) / 4294967296);
  };
}

const RELATABLE_IMAGES = [
  'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9', // trash shoreline
  'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b', // plastic bottles coast
  'https://images.unsplash.com/photo-1528323273322-d81458248d40', // plastic pollution
  'https://images.unsplash.com/photo-1618477461853-cf6ed80fbfc5', // garbage bags
  'https://images.unsplash.com/photo-1605600659908-0ef719419d41', // litter road
  'https://images.unsplash.com/photo-1595278149814-72236d65f583', // landfill
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09', // environment cleanup
  'https://images.unsplash.com/photo-1621451537084-482c73073e0f', // trash ocean
];
function getRelatableImage(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  const index = Math.abs(h) % RELATABLE_IMAGES.length;
  return `${RELATABLE_IMAGES[index]}?w=1400&h=220&fit=crop`;
}

const { width } = Dimensions.get('window');

const narrativeCache: Record<string, string> = {};

export default function MissionBriefScreen() {
  const router = useRouter();
  const [missions, setMissions] = useState<(Mission & { distance?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('your area');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userStats, setUserStats] = useState<{ level: number, xp: number } | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isImprovising, setIsImprovising] = useState(false);

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


        let userProfileData = null;
        // Fetch user stats
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('xp, level')
            .eq('id', session.user.id)
            .single();
          if (profileData) {
            setUserStats(profileData);
            userProfileData = profileData;
          }
        }
        // Fetch active missions from supabase
        const { data, error } = await supabase
          .from('missions')
          .select('*')
          .eq('status', 'active');

        if (!error && data) {
          const missionsWithDistance = (data as Mission[]).map((m: any) => {
            const rand = seededRandom(m.id);
            const latOffset = (rand() - 0.5) * 0.01;
            const lngOffset = (rand() - 0.5) * 0.01;

            const updatedCoords = {
              lat: userLat + latOffset,
              lng: userLng + lngOffset
            };

            return {
              ...m,
              coordinates: updatedCoords,
              distance: getDistanceFromLatLonInKm(userLat, userLng, updatedCoords.lat, updatedCoords.lng)
            };
          });

          // K-Means clustering architecture mapping
          if (missionsWithDistance.length > 3) {
            const maxDistance = Math.max(...missionsWithDistance.map(m => m.distance || 0.1));

            const points: Point[] = missionsWithDistance.map(m => ({
              id: m.id,
              features: [(m.distance || 0) / maxDistance, m.priority / 5],
              originalData: m
            }));

            // Generate 3 behavioral clusters
            const clusters = kMeans(points, 3);
            const userLevelNorm = (userProfileData?.level || 1) / 5;

            // Score clusters: prefer low distance, and priority matching user level
            const scoredClusters = clusters.map(cluster => {
              const meanDist = cluster.reduce((sum, p) => sum + p.features[0], 0) / cluster.length;
              const meanPri = cluster.reduce((sum, p) => sum + p.features[1], 0) / cluster.length;
              const score = meanDist * 0.6 + Math.abs(meanPri - userLevelNorm) * 0.4;
              return { cluster, score };
            });

            // Sort clusters by best score
            scoredClusters.sort((a, b) => a.score - b.score);

            // Recombine missions based on best clustered priorities
            const sortedMissions: (Mission & { distance?: number })[] = [];
            for (const sc of scoredClusters) {
              const sortedInCluster = sc.cluster
                .map(p => p.originalData)
                .sort((a, b) => (a.distance || 0) - (b.distance || 0));
              sortedMissions.push(...sortedInCluster);
            }
            setMissions(sortedMissions.slice(0, 5));
          } else {
            missionsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            setMissions(missionsWithDistance.slice(0, 5));
          }
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

  const handleImprovise = async () => {
    const selectedMission = missions[currentIndex];
    if (!selectedMission) return;

    if (narrativeCache[selectedMission.id]) {
      setAiNarrative(narrativeCache[selectedMission.id]);
      return;
    }

    setIsImprovising(true);
    try {
      const res = await fetch('https://omrqdxvgkxqikkorsnwx.supabase.co/functions/v1/ai-engine/generate-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: 25, condition: 'severe', wind_speed: 15, humidity: 65,
          location_name: locationName || 'Local Sector',
          lat: selectedMission.coordinates.lat, lng: selectedMission.coordinates.lng
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.narrative ? `✨ ${data.narrative}` : `✨ Sensors detect hazardous readings requiring immediate attention.`;
        narrativeCache[selectedMission.id] = text;
        setAiNarrative(text);
      } else {
        const fallback = `✨ (Gemini Bypass): AI verification requested. Environmental discrepancy flagged at ${locationName}.`;
        narrativeCache[selectedMission.id] = fallback;
        setAiNarrative(fallback);
      }
    } catch {
      const fallback = `✨ (Gemini Bypass): AI verification requested. Environmental discrepancy flagged at ${locationName}.`;
      narrativeCache[selectedMission.id] = fallback;
      setAiNarrative(fallback);
    } finally {
      setIsImprovising(false);
    }
  };

  const handleViewDetails = () => {
    setAiNarrative(null);
    setShowDetails(true);
    handleImprovise();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Local Missions</Text>
          <Text style={styles.subtitle}>
            Showing adaptive missions for {locationName}
            {userStats ? ` • Scout Level ${userStats.level}` : ''}
          </Text>
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
                      <Text style={[styles.badge, styles.activeBadge]}>AVAILABLE QUEST</Text>
                      <Text style={[styles.badge, styles.priorityBadge, mission.priority >= 4 && styles.urgentBadge]}>
                        PRIORITY {mission.priority}
                      </Text>
                      {userStats && mission.priority > userStats.level && (
                        <Text style={[styles.badge, styles.priorityBadge, { backgroundColor: '#f1f5f9', color: '#64748b' }]}>
                          CHALLENGING
                        </Text>
                      )}
                    </View>

                    <Text style={styles.missionCardTitle}>
                      {mission.title ? mission.title : `Mission #${index + 1}`}
                    </Text>

                    <View style={styles.heroCard}>
                      <Image
                        source={{
                          uri: getRelatableImage(mission.id),
                        }}
                        style={styles.heroImage}
                      />
                      <View style={styles.overlayLabel}>
                        <Text style={styles.overlayLabelText}>
                          {mission.location_name || (mission.distance !== undefined
                            ? (mission.distance < 1 ? `${Math.round(mission.distance * 1000)} m away` : `${mission.distance.toFixed(1)} km away`)
                            : 'Nearby')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.sectionTitle}>Intelligence Report</Text>
                    <Text style={styles.body}>
                      {mission.narrative ? mission.narrative : `Sensor networks and scout reports indicate a priority ${mission.priority} issue at this location. Objective: document pollutant categories, mitigate the issue if possible, and submit a verified report to earn rewards.`}
                    </Text>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricBox}>
                        <Text style={styles.metricValue}>{Math.round(mission.priority * 100 + 50)}</Text>
                        <Text style={styles.metricLabel}>XP</Text>
                      </View>
                      <View style={styles.metricBox}>
                        <Text style={[styles.metricValue, { color: EcoColors.sky }]}>{mission.priority * 5}</Text>
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

        {/* Full Screen Details Modal */}
        <Modal visible={showDetails} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {missions[currentIndex] && (
                <>
                  <Text style={styles.modalTitle}>{missions[currentIndex].title}</Text>
                  <Text style={styles.urgencyBadgeModal}>Priority Level: {missions[currentIndex].priority}</Text>

                  <ScrollView style={{ maxHeight: '50%', marginVertical: EcoSpacing.md }}>
                    <Text style={styles.modalSectionTitle}>Detailed Intelligence Report</Text>
                    {isImprovising ? (
                      <Text style={[styles.modalBody, { fontStyle: 'italic' }]}>✨ Gemini is analyzing the anomaly...</Text>
                    ) : (
                      <Text style={styles.modalBody}>
                        {aiNarrative || missions[currentIndex].narrative || 'Detailed documentation pending. Assess on-site.'}
                      </Text>
                    )}

                    <Text style={[styles.modalSectionTitle, { marginTop: EcoSpacing.md, color: EcoColors.primary }]}>
                      Verification Objective
                    </Text>
                    <Text style={styles.modalBody}>
                      1. Navigate to the marked 500-meter radius location.
                      2. Clean up or neutralize the identified environmental hazard.
                      3. Use the app to snap verifiable photographic evidence of the resolved zone.
                    </Text>
                  </ScrollView>

                  <Pressable style={[styles.primaryButton, { marginTop: EcoSpacing.sm }]} onPress={() => {
                    setShowDetails(false);
                    handleStartMission();
                  }}>
                    <Text style={styles.primaryText}>Start Quest Now</Text>
                  </Pressable>
                  <Pressable style={{ padding: 16, alignItems: 'center' }} onPress={() => setShowDetails(false)}>
                    <Text style={{ color: EcoColors.textMuted, fontWeight: '700' }}>Close Details</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: EcoColors.surface,
    borderTopLeftRadius: EcoRadius.xl,
    borderTopRightRadius: EcoRadius.xl,
    padding: EcoSpacing.xl,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: EcoColors.text,
    marginBottom: EcoSpacing.xs,
  },
  urgencyBadgeModal: {
    backgroundColor: '#fff6e8',
    color: EcoColors.warning,
    fontWeight: '700',
    fontSize: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: EcoColors.text,
    marginTop: EcoSpacing.sm,
    marginBottom: EcoSpacing.xs,
  },
  modalBody: {
    fontSize: 15,
    color: EcoColors.textMuted,
    lineHeight: 22,
  },
  actionRowModal: {
    flexDirection: 'row',
    marginTop: EcoSpacing.sm,
  },
  secondaryBtnModal: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: EcoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryBtnTextModal: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 15,
  },
});
