import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadSavedStickerUris } from './lib/sticker-storage';

export default function StickersScreen() {
  const router = useRouter();
  const [stickerUris, setStickerUris] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStickers = useCallback(async () => {
    setIsLoading(true);
    const saved = await loadSavedStickerUris();
    setStickerUris([...saved].reverse());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshStickers();
    }, [refreshStickers])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void refreshStickers()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.title}>Stickers din Generator</Text>
        <Text style={styles.subtitle}>
          Aici vezi toate stickerele salvate local din ecranul de generator.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Se incarca stickerele...</Text>
        </View>
      ) : stickerUris.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>Nu ai stickere salvate inca.</Text>
          <Text style={styles.emptySubtitle}>
            Mergi in Generator, creeaza un sticker si apasa Save to App.
          </Text>
          <TouchableOpacity onPress={() => router.push('/generator')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Deschide Generator</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {stickerUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.card}>
              <Image source={{ uri }} style={styles.stickerImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#020617',
    flex: 1,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    borderColor: 'rgba(125, 211, 252, 0.2)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 15,
    marginTop: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 26,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    padding: 8,
    width: '48%',
  },
  stickerImage: {
    height: '100%',
    width: '100%',
  },
});
