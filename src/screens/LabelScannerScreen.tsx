import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { recognizeLabel } from '../services/ocr';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { extractFromOcrText, ExtractedNutrition } from '../api/labelScanner';

type LabelScannerRouteProp = RouteProp<RootStackParamList, 'LabelScanner'>;

export default function LabelScannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<LabelScannerRouteProp>();
  const mealType = (route.params as any)?.mealType || 'meal';

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [editingText, setEditingText] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to scan nutrition labels.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      setPhotoUri(photo.uri);

      // Auto-run OCR on the captured photo
      const result = await recognizeLabel(photo.uri);
      const text = result.text || '';
      setOcrText(text);

      if (!text.trim()) {
        Alert.alert(
          'No text detected',
          'Could not read any text from the photo. Try taking a clearer photo, or enter the label info manually.',
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to capture/scan photo');
    } finally {
      setScanning(false);
    }
  };

  const retakePhoto = () => {
    setPhotoUri(null);
    setOcrText('');
    setEditingText(false);
  };

  const processLabel = async () => {
    if (!ocrText.trim()) {
      Alert.alert('No text', 'Please take a clearer photo or type the label text manually.');
      setEditingText(true);
      return;
    }

    setExtracting(true);
    try {
      const extracted: ExtractedNutrition = await extractFromOcrText(ocrText);
      navigation.navigate('PortionAdjust', {
        extracted,
        photoUri,
        ocrRawText: ocrText,
        mealType,
      });
    } catch (err: any) {
      Alert.alert('Extraction Failed', err?.message || 'Could not extract nutrition data.');
    } finally {
      setExtracting(false);
    }
  };

  // If photo is taken, show the review screen with OCR results
  if (photoUri) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Scanned Label</Text>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />

        {scanning ? (
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color="#1e6fb8" />
            <Text style={styles.scanningText}>Reading label text...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Extracted Text</Text>
            {ocrText.trim() ? (
              <View style={styles.ocrBox}>
                {editingText ? (
                  <TextInput
                    style={styles.multilineInput}
                    value={ocrText}
                    onChangeText={setOcrText}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    autoCapitalize="none"
                    placeholder="Edit the scanned text..."
                  />
                ) : (
                  <Pressable onPress={() => setEditingText(true)}>
                    <Text style={styles.ocrPreview}>{ocrText}</Text>
                    <Text style={styles.editHint}>Tap to edit if needed</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.ocrBox}>
                <Text style={styles.noText}>No text detected from the photo.</Text>
                <TextInput
                  style={[styles.multilineInput, { marginTop: 8 }]}
                  value={ocrText}
                  onChangeText={setOcrText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  placeholder="Type the nutrition label info here: Serving Size, Calories, Protein, Carbs, Fat..."
                />
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={retakePhoto}>
                <Text style={styles.btnSecondaryText}>Retake</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={processLabel} disabled={extracting}>
                {extracting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Extract Nutrition</Text>
                )}
              </Pressable>
            </View>

            <Pressable
              style={[styles.btn, { marginTop: 12, backgroundColor: '#6c63ff' }]}
              onPress={() => {
                navigation.navigate('PortionAdjust', {
                  extracted: null,
                  photoUri,
                  ocrRawText: ocrText,
                  mealType,
                });
              }}
            >
              <Text style={styles.btnText}>Enter Manually Instead</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    );
  }

  // Camera view
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.hint}>Position the nutrition label within the frame</Text>
        </View>
      </CameraView>

      <View style={styles.cameraControls}>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.goBack()}>
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.captureBtn} onPress={takePhoto}>
          <View style={styles.captureBtnInner} />
        </Pressable>
        <View style={{ width: 80 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginTop: 16, marginBottom: 8 },
  preview: { width: '100%', height: 250, borderRadius: 12, backgroundColor: '#eee' },

  scanningBox: { alignItems: 'center', paddingVertical: 30 },
  scanningText: { marginTop: 12, fontSize: 15, color: '#1e6fb8', fontWeight: '600' },

  ocrBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ocrPreview: { fontSize: 14, color: '#333', lineHeight: 20 },
  editHint: { fontSize: 12, color: '#999', marginTop: 8, fontStyle: 'italic' },
  noText: { fontSize: 14, color: '#c0392b', fontWeight: '600' },

  multilineInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    minHeight: 120,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  btn: {
    backgroundColor: '#1e6fb8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#eee' },
  btnSecondaryText: { color: '#333', fontSize: 15, fontWeight: '600' },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: 280,
    height: 200,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', fontSize: 14, marginTop: 16, textAlign: 'center' },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#000',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#1e6fb8',
  },
});
