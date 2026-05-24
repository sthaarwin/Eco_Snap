import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';
import { supabase } from '@/lib/supabase';
import { MapView, Marker, Polyline } from '@/components/map-view';

type Hotspot = {
  id: string;
  coordinates: { lat: number; lng: number };
  status: 'active' | 'resolved';
  severity: number;
  category: string;
  mission_id: string | null;
  created_at: string;
};

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const DEFAULT_REGION = {
  latitude: 28.7041,
  longitude: 77.1025,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function LiveMapPageScreen() {
  const params = useLocalSearchParams<{ tracking?: string, missionId?: string }>();
  const isTracking = params.tracking === 'true';

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [locationStatus, setLocationStatus] = useState('Finding your GPS location...');
  const [pathCoordinates, setPathCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    const fetchHotspots = async () => {
      const { data, error } = await supabase
        .from('hotspots')
        .select('*')
        .order('severity', { ascending: false });

      if (!error && data) {
        setHotspots(data as unknown as Hotspot[]);
      }
    };

    fetchHotspots();

    const channel = supabase
      .channel('hotspots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotspots' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setHotspots((prev) => [payload.new as Hotspot, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setHotspots((prev) =>
            prev.map((h) => (h.id === (payload.new as Hotspot).id ? (payload.new as Hotspot) : h)),
          );
        } else if (payload.eventType === 'DELETE') {
          setHotspots((prev) => prev.filter((h) => h.id !== (payload.old as Hotspot).id));
        }
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
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 5000,
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

  const severityColor = (severity: number) => {
    if (severity >= 4) return '#ef4444';
    if (severity >= 2) return '#f59e0b';
    return '#22c55e';
  };

  const activeHotspots = hotspots.filter((h) => h.status === 'active');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Live Impact Map</Text>
        <Text style={styles.subtitle}>
          Real-time field telemetry from scout submissions and sensor stations.
        </Text>

        {Platform.OS === 'web' ? (
          <View style={styles.mapCard}>
            <View style={styles.gridOverlay}>
              {Array.from({ length: 6 }).map((_, index) => (
                <View key={`line-${index}`} style={[styles.gridLine, { top: `${index * 20}%` }]} />
              ))}
            </View>

            {activeHotspots.map((spot) => (
              <View
                key={spot.id}
                style={[
                  styles.hotspot,
                  {
                    left: `${((spot.coordinates.lng + 180) / 360) * 80 + 10}%` as any,
                    top: `${((90 - spot.coordinates.lat) / 180) * 80 + 10}%` as any,
                    backgroundColor: severityColor(spot.severity),
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
              {activeHotspots.length} hotspot{activeHotspots.length !== 1 ? 's' : ''} active
            </Text>
          </View>
        ) : (
          <View style={styles.mapCard}>
            <MapView
              style={StyleSheet.absoluteFill}
              region={mapRegion}
              showsMyLocationButton
              showsUserLocation
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
                  coordinate={currentLocation}
                  pinColor={EcoColors.primary}
                  title="Current location"
                  description={locationStatus}
                />
              ) : null}

              {activeHotspots.map((spot) => (
                <Marker
                  key={spot.id}
                  coordinate={{
                    latitude: spot.coordinates.lat,
                    longitude: spot.coordinates.lng,
                  }}
                  pinColor={severityColor(spot.severity)}
                  title={`Severity ${spot.severity}`}
                  description={(spot.category || 'Unknown Category').replace(/_/g, ' ')}
                />
              ))}
            </MapView>
          </View>
        )}

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

        <View style={styles.feedCard}>
          <Text style={styles.feedTitle}>Live Feed</Text>
          {activeHotspots.length === 0 ? (
            <Text style={styles.feedItem}>No active hotspots. All clear.</Text>
          ) : (
            activeHotspots.slice(0, 5).map((spot) => (
              <Text key={spot.id} style={styles.feedItem}>
                {(spot.category || 'Unknown Category').replace(/_/g, ' ')} detected (severity {spot.severity}).
              </Text>
            ))
          )}
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
});
