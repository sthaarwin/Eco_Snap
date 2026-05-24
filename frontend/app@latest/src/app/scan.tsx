import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Platform, Pressable, StyleSheet, Text, View, Modal, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

import { EcoColors, EcoRadius, EcoSpacing } from '@/constants/ecosnap-theme';

export default function ScanScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const params = useLocalSearchParams<{ missionId?: string }>();

  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      });

      if (!photo?.uri) {
        Alert.alert('Photo error', 'Could not capture a photo. Please try again.');
        return;
      }

      setCapturedPhotoUri(photo.uri);
      setCapturedPhotoBase64(photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : null);
      setShowPreviewModal(true);
    } finally {
      setIsTakingPicture(false);
    }
  };

  const handleRetake = () => {
    setShowPreviewModal(false);
    setCapturedPhotoUri(null);
    setCapturedPhotoBase64(null);
  };

  const handleUpload = async () => {
    if (!capturedPhotoBase64 || isUploading) {
      return;
    }
    if (!params.missionId) {
      Alert.alert('No active mission', 'Cannot upload: no mission ID provided.');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session expired. Please sign in again.');
      }

      // We omit the edge-function URL explicitly to correctly map to Supabase edge function
      const response = await fetch(`https://omrqdxvgkxqikkorsnwx.supabase.co/functions/v1/submission-engine/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mission_id: params.missionId,
          image_base64: capturedPhotoBase64,
          latitude: 0,
          longitude: 0, // Using placeholders depending on logic, since coordinates check is done locally on map screen
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'Upload failed');
      }

      const result = await response.json() as { verification_status?: string; reward_awarded?: number; ai_reasoning?: string };

      console.log('━━━ GEMINI RESPONSE LOG ━━━')
      console.log(`Status: ${result.verification_status}`);
      console.log(`Reasoning: ${result.ai_reasoning}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      setShowPreviewModal(false);
      setCapturedPhotoUri(null);
      setCapturedPhotoBase64(null);

      if (result.verification_status === 'approved') {
        Alert.alert('✅ Approved', `Gemini verified your submission!${result.reward_awarded ? ` +${result.reward_awarded} XP awarded.` : ''}`, [
          { text: "OK", onPress: () => router.push('/council-page') }
        ]);
      } else if (result.verification_status === 'rejected') {
        const reason = result.ai_reasoning || 'The image was too blurry, too dark, or could not be understood.';
        Alert.alert('❌ Submission Rejected', `Gemini rejected this photo.\n\nReason: ${reason}\n\nPlease retake the photo clearly.`, [
          { text: "Retake", style: 'cancel', onPress: handleRetake },
          { text: "Cancel", onPress: () => router.push('/live-map-page') }
        ]);
      } else {
        Alert.alert('🔍 Sent for Council Review', `Gemini was unsure about this submission and escalated it for human review.\n\n${result.ai_reasoning ? `AI note: ${result.ai_reasoning}` : ''}`, [
          { text: "OK", onPress: () => router.push('/council-page') }
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      Alert.alert('Upload error', message);
    } finally {
      setIsUploading(false);
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
              Snap a photo of clearing the quest
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

      <Modal visible={showPreviewModal} transparent animationType="fade" onRequestClose={handleRetake}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Preview Photo</Text>
            {capturedPhotoUri ? (
              <Image source={{ uri: capturedPhotoUri }} style={styles.previewImage} resizeMode="cover" />
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.retakeButton} onPress={handleRetake}>
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </Pressable>
              <Pressable
                style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                onPress={() => void handleUpload()}
                disabled={isUploading}>
                <Text style={styles.uploadButtonText}>{isUploading ? 'Uploading...' : 'Submit to Gemini AI'}</Text>
              </Pressable>
            </View>
          </View>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 16, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: EcoSpacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: EcoRadius.xl,
    borderWidth: 1,
    borderColor: EcoColors.border,
    backgroundColor: EcoColors.surface,
    padding: EcoSpacing.md,
    gap: EcoSpacing.md,
  },
  modalTitle: {
    color: EcoColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: EcoRadius.lg,
    backgroundColor: '#e7ece8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: EcoSpacing.sm,
  },
  retakeButton: {
    flex: 1,
    borderRadius: EcoRadius.md,
    borderWidth: 1,
    borderColor: EcoColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: EcoColors.surface,
  },
  retakeButtonText: {
    color: EcoColors.text,
    fontWeight: '700',
  },
  uploadButton: {
    flex: 1,
    borderRadius: EcoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: EcoColors.primary,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
