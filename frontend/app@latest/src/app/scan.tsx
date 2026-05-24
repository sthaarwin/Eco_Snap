import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

export default function ScanScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = ({ data, type }: { data: string; type: string }) => {
    if (scannedValue) {
      return;
    }

    setScannedValue(`${type}: ${data}`);
  };

  const handleShutterPress = async () => {
    if (isTakingPicture || !cameraRef.current) {
      return;
    }

    setIsTakingPicture(true);

    try {
      await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      setScannedValue('Photo captured. Point the camera at a QR or marker to scan.');
    } finally {
      setIsTakingPicture(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.title}>Starting camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <View style={styles.card}>
            <Text style={styles.title}>Camera access needed</Text>
            <Text style={styles.body}>
              Allow camera permission so EcoSnap can scan mission markers and QR codes.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
              <Text style={styles.primaryButtonText}>Allow camera</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.cameraShell}>
          {Platform.OS === 'web' ? (
            <View style={[styles.cameraPreview, styles.webFallback]}>
              <Text style={styles.webFallbackTitle}>Camera preview is best on Android or iPhone.</Text>
              <Text style={styles.body}>Open the app in Expo Go to use live scanning.</Text>
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.cameraPreview}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          )}

          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Text style={styles.title}>Scan Ready</Text>
            <Text style={styles.body}>
              Point the camera at a mission marker or field QR to register the next action.
            </Text>
            {scannedValue ? <Text style={styles.result}>{scannedValue}</Text> : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleShutterPress()}
          style={({ pressed }) => [styles.shutterButton, pressed && styles.shutterPressed]}>
          <View style={styles.shutterInner} />
        </Pressable>

        <Text style={styles.shutterHint}>{isTakingPicture ? 'Capturing...' : 'Tap to click a photo'}</Text>
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
    padding: EcoSpacing.lg,
    gap: EcoSpacing.md,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    padding: EcoSpacing.lg,
  },
  cameraShell: {
    flex: 1,
    borderRadius: EcoRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surface,
    position: 'relative',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: EcoSpacing.lg,
    backgroundColor: '#edf4ef',
  },
  webFallbackTitle: {
    color: EcoColors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: EcoSpacing.lg,
    backgroundColor: 'rgba(10, 22, 16, 0.18)',
    gap: EcoSpacing.md,
  },
  card: {
    borderRadius: EcoRadius.xl,
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.lg,
    alignItems: 'center',
    gap: EcoSpacing.md,
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderRadius: EcoRadius.xl,
    position: 'relative',
    alignSelf: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 34,
    height: 34,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: EcoColors.primary,
    borderTopLeftRadius: 14,
  },
  cornerTopRight: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 34,
    height: 34,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: EcoColors.primary,
    borderTopRightRadius: 14,
  },
  cornerBottomLeft: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    width: 34,
    height: 34,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: EcoColors.primary,
    borderBottomLeftRadius: 14,
  },
  cornerBottomRight: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 34,
    height: 34,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: EcoColors.primary,
    borderBottomRightRadius: 14,
  },
  title: {
    color: EcoColors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: '#edf4ef',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  result: {
    color: '#fff',
    backgroundColor: 'rgba(10, 22, 16, 0.48)',
    paddingHorizontal: EcoSpacing.md,
    paddingVertical: 10,
    borderRadius: EcoRadius.lg,
    textAlign: 'center',
    overflow: 'hidden',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: EcoColors.primary,
    borderRadius: EcoRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: EcoSpacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  shutterButton: {
    alignSelf: 'center',
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: EcoColors.border,
    shadowColor: '#0a120f',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  shutterPressed: {
    opacity: 0.8,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: EcoColors.primary,
    backgroundColor: '#fff',
  },
  shutterHint: {
    textAlign: 'center',
    color: EcoColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});