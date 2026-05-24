import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';
import { MapView, Marker, Polyline, Circle } from '@/components/map-view';

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
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
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

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const DEFAULT_REGION = {
  latitude: 28.7041,
  longitude: 77.1025,
  latitudeDelta: 0.05,
  longitudeDelta: 0.0421,
};

const narrativeCache: Record<string, string> = {};


// Module-level persistent state so active quest survives tab switching
let globalActiveMissionId: string | null = null;

export default function LiveMapPageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tracking?: string, missionId?: string, clearTracking?: string }>();

  // Intercept incoming tracking commands to update global state
  if (params.tracking === 'true' && params.missionId && typeof params.missionId === 'string') {
    globalActiveMissionId = params.missionId;
  }

  // If the user deliberately clears tracking from somewhere else, support it
  if (params.clearTracking === 'true') {
    globalActiveMissionId = null;
  }

  const isTracking = globalActiveMissionId !== null;
  const targetId = globalActiveMissionId;
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [locationStatus, setLocationStatus] = useState('Finding your GPS location...');
  const [pathCoordinates, setPathCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isImprovising, setIsImprovising] = useState(false);

  const handleMarkerPress = (spot: Mission) => {
    setSelectedMission(spot);
    setAiNarrative(null);
    handleImprovise(spot);
  };

  const handleImprovise = async (spot: Mission) => {
    if (narrativeCache[spot.id]) {
      setAiNarrative(narrativeCache[spot.id]);
      return;
    }

    setIsImprovising(true);
    try {
      const res = await fetch('https://omrqdxvgkxqikkorsnwx.supabase.co/functions/v1/ai-engine/generate-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: 25, condition: 'anomalous', wind_speed: 15, humidity: 65,
          location_name: spot.location_name || 'Grid Sector',
          lat: spot.coordinates.lat, lng: spot.coordinates.lng
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.narrative) {
          const text = `✨ ${data.narrative}`;
          narrativeCache[spot.id] = text;
          setAiNarrative(text);
        } else {
          const text = `✨ (Gemini API Config Required): Sensors detect critical anomaly. Action required!`;
          narrativeCache[spot.id] = text;
          setAiNarrative(text);
        }
      } else {
        const text = `✨ (Gemini Bypass): Sensors detect critical anomalous signatures at these coordinates. Immediate verification mandated!`;
        narrativeCache[spot.id] = text;
        setAiNarrative(text);
      }
    } catch {
      const text = `✨ (Gemini Bypass): Sensors detect critical anomalous signatures at these coordinates. Immediate verification mandated!`;
      narrativeCache[spot.id] = text;
      setAiNarrative(text);
    } finally {
      setIsImprovising(false);
    }
  };

  useEffect(() => {
    const fetchMissions = async () => {

      let uLat = DEFAULT_REGION.latitude;
      let uLng = DEFAULT_REGION.longitude;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === Location.PermissionStatus.GRANTED) {
          const loc = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync();
          if (loc) {
            uLat = loc.coords.latitude;
            uLng = loc.coords.longitude;
          }
        }
      } catch (e) { }

      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('status', 'active');

      if (!error && data) {
        const mapped = data.map((m: any) => {
          const rand = seededRandom(m.id);
          // offset by up to roughly 1km (0.01 deg)
          const latOffset = (rand() - 0.5) * 0.01;
          const lngOffset = (rand() - 0.5) * 0.01;
          return {
            ...m,
            coordinates: {
              lat: uLat + latOffset,
              lng: uLng + lngOffset
            }
          }
        });
        setMissions(mapped.sort((a, b) => b.priority - a.priority));

      }
    };

    fetchMissions();

    const channel = supabase
      .channel('missions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => {
        fetchMissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const updateLocation = (location: Location.LocationObject) => {
      const nextLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      setCurrentLocation(nextLocation);

      setMapRegion((region) => ({
        ...region,
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
      }));

      setLocationStatus(
        nextLocation.accuracy
          ? `Current location accurate to ${Math.round(nextLocation.accuracy)}m`
          : 'Current GPS location active',
      );

      if (isTracking) {
        setPathCoordinates((prev) => [
          ...prev,
          { latitude: nextLocation.latitude, longitude: nextLocation.longitude },
        ]);
      }
    };

    const startLocationTracking = async () => {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationStatus('Turn on location services to show your current position.');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationStatus('Location permission is needed to show your current position.');
        return;
      }

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (isMounted) {
        updateLocation(initialLocation);
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 1, // update every 1 meter moved
          timeInterval: 2000,  // update every 2 seconds minimum if stationary
        },
        (location) => {
          if (isMounted) {
            updateLocation(location);
          }
        },
      );
    };

    startLocationTracking().catch(() => {
      if (isMounted) {
        setLocationStatus('Unable to read your GPS location right now.');
      }
    });

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [isTracking]);

  const priorityColor = (priority: number) => {
    if (priority >= 4) return '#ef4444';
    if (priority >= 2) return '#f59e0b';
    return '#22c55e';
  };


  const activeMissions = missions.filter((m) => m.status === 'active');

  // Find if user is in range of any target mission
  const activeTargetMission = isTracking && targetId
    ? activeMissions.find(m => m.id === targetId)
    : null;

  let canClearQuest = false;
  if (activeTargetMission && currentLocation) {
    const dist = getDistanceFromLatLonInKm(
      currentLocation.latitude,
      currentLocation.longitude,
      activeTargetMission.coordinates.lat,
      activeTargetMission.coordinates.lng
    );
    // Radius is 500 meters (0.5 km)
    if (dist <= 0.5) canClearQuest = true;
  }

  // Decide which missions to map over
  const mapMissions = activeTargetMission ? [activeTargetMission] : activeMissions.slice(0, 5);


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Live Impact Map</Text>
        <Text style={styles.subtitle}>{locationStatus}</Text>

        <View style={styles.mapCard}>
          {Platform.OS === 'web' ? (
            <>
              <View style={styles.gridOverlay}>
                {[...Array(6)].map((_, i) => (
                  <View key={`line-${i}`} style={[styles.gridLine, { top: `${i * 20}%` }]} />
                ))}
              </View>

              {isTracking && pathCoordinates.length > 1 && (
                <Polyline
                  coordinates={pathCoordinates}
                  strokeColor="#ef4444"
                  strokeWidth={4}
                />
              )}
              {mapMissions.map((spot) => (
                <View
                  key={spot.id}
                  style={[
                    styles.hotspot,
                    {
                      left: `${((spot.coordinates.lng + 180) / 360) * 80 + 10}%` as any,
                      top: `${((90 - spot.coordinates.lat) / 180) * 80 + 10}%` as any,
                      backgroundColor: priorityColor(spot.priority),
                    },
                  ]}

                />
              ))}

              {currentLocation ? (
                <View
                  style={[
                    styles.currentLocation,
                    {
                      left: `${((currentLocation.longitude + 180) / 360) * 80 + 10}%` as any,
                      top: `${((90 - currentLocation.latitude) / 180) * 80 + 10}%` as any,
                    },
                  ]}
                />
              ) : null}


              <Text style={styles.mapLabel}>
                {activeTargetMission
                  ? 'Target Mission Coordinates Locked'
                  : `${activeMissions.length} mission${activeMissions.length !== 1 ? 's' : ''} active`}
              </Text>
            </>
          ) : (
            <MapView
              style={StyleSheet.absoluteFillObject}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {isTracking && pathCoordinates.length > 1 && (
                <Polyline
                  coordinates={pathCoordinates}
                  strokeColor="#ef4444"
                  strokeWidth={4}
                />
              )}

              {currentLocation ? (
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  pinColor={EcoColors.sky}
                  title="Your Position"
                />
              ) : null}

              {activeTargetMission && currentLocation && (
                <Polyline
                  coordinates={[
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    { latitude: activeTargetMission.coordinates.lat, longitude: activeTargetMission.coordinates.lng }
                  ]}
                  strokeColor={canClearQuest ? EcoColors.primary : EcoColors.sky}
                  strokeWidth={4}
                  lineDashPattern={[5, 10]}
                />
              )}

              {mapMissions.map((spot) => (
                <View key={spot.id}>
                  <Marker
                    coordinate={{
                      latitude: spot.coordinates.lat,
                      longitude: spot.coordinates.lng,
                    }}
                    pinColor={priorityColor(spot.priority)}
                    title={`Priority ${spot.priority}`}
                    description={spot.title || 'Unknown Mission'}
                    onPress={() => handleMarkerPress(spot)}
                  />
                  <Circle
                    center={{
                      latitude: spot.coordinates.lat,
                      longitude: spot.coordinates.lng,
                    }}
                    radius={500} // 500 meters
                    strokeColor={isTracking && targetId === spot.id ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.4)"}
                    fillColor={isTracking && targetId === spot.id ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.1)"}
                  />
                </View>
              ))}
            </MapView>
          )}
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>GPS Current Location</Text>
          <Text style={styles.locationText}>{locationStatus}</Text>
          {currentLocation ? (
            <Text style={styles.locationCoords}>
              {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </Text>
          ) : null}
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

        {selectedMission && (
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>{selectedMission.title || 'Mission'}</Text>
              <Text style={styles.urgencyBadge}>Priority {selectedMission.priority}</Text>
            </View>
            <Text style={styles.popupBody}>
              {isImprovising ? (
                <Text style={{ fontStyle: 'italic' }}>✨ Gemini is analyzing the anomaly...</Text>
              ) : (
                aiNarrative || selectedMission.narrative || 'No database narrative available.'
              )}
            </Text>

            <View style={{ backgroundColor: '#f1f5f9', padding: EcoSpacing.sm, borderRadius: EcoRadius.md, marginTop: EcoSpacing.xs }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: EcoColors.text, marginBottom: 4 }}>
                Objective
              </Text>
              <Text style={{ fontSize: 12, color: EcoColors.textMuted, lineHeight: 18 }}>
                Travel inside the 500m zone, resolve the hazard, and submit photographic evidence.
              </Text>
            </View>

            <View style={styles.popupActionRow}>
              <Pressable style={styles.primaryBtnSmall} onPress={() => {
                globalActiveMissionId = selectedMission.id;
                router.replace(`/live-map-page?tracking=true&missionId=${selectedMission.id}`);
                setSelectedMission(null);
                setAiNarrative(null);
              }}>
                <Text style={styles.primaryBtnSmallText}>Start Quest</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.feedCard}>
          <Text style={styles.feedTitle}>Live Feed</Text>

          {activeTargetMission ? (
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: EcoColors.primary, marginBottom: 8, letterSpacing: 0.5 }}>ACTIVE OPERATION IN PROGRESS:</Text>
              <Text style={styles.feedItem}>
                • {activeTargetMission.title} (Priority {activeTargetMission.priority})
              </Text>
              <Text style={{ fontSize: 14, color: canClearQuest ? EcoColors.primary : EcoColors.textMuted, marginTop: 4, fontWeight: '700' }}>
                {canClearQuest ? "✅ Coordinates reached. You may clear this quest." : "❌ Out of range. Move closer to the target zone."}
              </Text>
            </View>
          ) : activeMissions.length === 0 ? (

            <Text style={styles.feedItem}>No active missions. All clear.</Text>
          ) : (
            activeMissions.slice(0, 5).map((spot) => (
              <Text key={spot.id} style={styles.feedItem}>
                {spot.title || 'Unknown mission'} (Priority {spot.priority}).
              </Text>
            ))
          )}
        </View>

        {activeTargetMission ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              router.push(`/scan?missionId=${activeTargetMission.id}`);
            }}
          >
            <Text style={styles.primaryText}>
              {canClearQuest ? 'Scan to Verify Quest ✅' : 'Scan to Verify Quest'}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={() => router.push('/mission-brief')}>
            <Text style={styles.primaryText}>Browse Missions</Text>
          </Pressable>
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
  currentLocation: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: EcoRadius.pill,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: EcoColors.primary,
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
  locationCard: {
    borderRadius: EcoRadius.lg,
    borderColor: EcoColors.border,
    borderWidth: 1,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    gap: 4,
  },
  locationTitle: {
    color: EcoColors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  locationText: {
    color: EcoColors.textMuted,
    lineHeight: 20,
  },
  locationCoords: {
    color: EcoColors.primary,
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
    textTransform: 'capitalize',
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
  popupCard: {
    backgroundColor: EcoColors.surface,
    borderColor: EcoColors.border,
    borderWidth: 1,
    borderRadius: EcoRadius.lg,
    padding: EcoSpacing.md,
    gap: EcoSpacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: EcoColors.text,
    flex: 1,
  },
  urgencyBadge: {
    backgroundColor: '#fff6e8',
    color: EcoColors.warning,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  popupBody: {
    fontSize: 14,
    color: EcoColors.textMuted,
    lineHeight: 20,
  },
  popupActionRow: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
    marginTop: EcoSpacing.xs,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: EcoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  primaryBtnSmall: {
    flex: 1,
    backgroundColor: EcoColors.primary,
    borderRadius: EcoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  primaryBtnSmallText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
