import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveStickerUri } from './lib/sticker-storage';

export default function Generator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Generate a unique sticker using DiceBear API
    async function generateImage() {
        if (!prompt.trim()) {
            Alert.alert("Missing prompt", "Write a prompt before generating.");
            return;
        }

        setLoading(true);
        setImageUri(null);
        Keyboard.dismiss();

        try {
            const encodedPrompt = encodeURIComponent(prompt);
            const apiUrl = `https://api.dicebear.com/9.x/bottts/png?seed=${encodedPrompt}&size=512`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            setImageUri(apiUrl);
            setLoading(false);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Could not fetch the image. Check your internet connection.");
            setLoading(false);
        }
    }

    // Save the displayed image 
    async function saveImage() {
        if (!imageUri) return;
        setSaving(true);

        try {
            let finalUriToSave = imageUri;

            // Check if we are on a mobile device and FileSystem is available
            const storageDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;

            if (Platform.OS !== 'web' && storageDir) {
                // If on mobile, download the file physically to the device
                const fileName = `sticker_${Date.now()}.png`;
                const fileUri = `${storageDir}${fileName}`;
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                finalUriToSave = downloadResult.uri;
            } else {
                // If on Web or FileSystem is unavailable, we just save the URL string directly.
                // This guarantees the save function works 100% of the time.
                console.log("Running on Web or FileSystem unavailable. Saving URL directly to AsyncStorage.");
            }

            await saveStickerUri(finalUriToSave);

            Alert.alert(
                "Saved Successfully!",
                "The sticker has been added to your gallery.",
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            console.error("Save error:", error);
            Alert.alert("Error", "Could not save the image.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.topRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>

                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>API: DiceBear (Stable)</Text>
                        </View>
                    </View>

                    <View style={styles.headerCard}>
                        <Text style={styles.title}>Sticker Generator</Text>
                        <Text style={styles.subtitle}>Generate robot stickers instantly and save them.</Text>
                    </View>

                    <View style={styles.previewBox}>
                        {loading ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator size="large" color="#38bdf8" />
                                <Text style={styles.loadingText}>Fetching image...</Text>
                            </View>
                        ) : imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.img}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.placeholderContainer}>
                                <Text style={styles.info}>No sticker generated yet</Text>
                                <Text style={styles.subInfo}>Type anything below to generate a unique robot.</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type any word to generate a unique sticker..."
                            placeholderTextColor="#64748b"
                            value={prompt}
                            onChangeText={setPrompt}
                            multiline
                        />
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.genBtn, loading && styles.disabledBtn]}
                            onPress={generateImage}
                            disabled={loading}
                        >
                            <Text style={styles.genText}>{loading ? "Generating..." : "Generate AI"}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, (!imageUri || saving) && styles.disabledBtn]}
                        onPress={saveImage}
                        disabled={!imageUri || saving || loading}
                    >
                        <Text style={styles.saveTextPrimary}>{saving ? 'Saving...' : 'Save to App'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { backgroundColor: '#020617', flex: 1 },
    keyboardAvoid: { flex: 1 },
    container: { flexGrow: 1, padding: 16, paddingBottom: 40 },
    topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    backBtn: { backgroundColor: 'rgba(15, 23, 42, 0.88)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 10 },
    backText: { color: '#f8fafc', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
    statusPill: { backgroundColor: 'rgba(22, 163, 74, 0.2)', borderColor: 'rgba(74, 222, 128, 0.4)', borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
    statusPillText: { color: '#bbf7d0', fontSize: 12, fontWeight: '700' },
    headerCard: { backgroundColor: 'rgba(2, 6, 23, 0.82)', borderColor: 'rgba(125, 211, 252, 0.18)', borderRadius: 22, borderWidth: 1, marginBottom: 14, padding: 16 },
    title: { color: '#f8fafc', fontSize: 26, fontWeight: '800', marginBottom: 6 },
    subtitle: { color: '#94a3b8', fontSize: 14, lineHeight: 20 },
    previewBox: { alignItems: 'center', backgroundColor: '#0f172a', borderColor: 'rgba(148, 163, 184, 0.28)', borderRadius: 22, borderWidth: 1, height: 340, justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
    img: { height: '100%', width: '100%' },
    placeholderContainer: { alignItems: 'center', paddingHorizontal: 16 },
    info: { color: '#cbd5e1', fontSize: 15, fontWeight: '700', textAlign: 'center' },
    subInfo: { color: '#64748b', fontSize: 13, marginTop: 8, textAlign: 'center' },
    loadingWrapper: { alignItems: 'center' },
    loadingText: { color: '#bae6fd', fontSize: 13, fontWeight: '700', marginTop: 12 },
    inputContainer: { marginBottom: 12 },
    input: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, color: '#f8fafc', fontSize: 15, minHeight: 80, padding: 14, textAlignVertical: 'top' },
    actionRow: { flexDirection: 'row', marginBottom: 12 },
    actionBtn: { alignItems: 'center', borderRadius: 16, justifyContent: 'center', paddingVertical: 14 },
    genBtn: { backgroundColor: '#2563eb', flex: 1 },
    genText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    saveBtn: { alignItems: 'center', backgroundColor: '#16a34a', borderRadius: 16, justifyContent: 'center', paddingVertical: 14 },
    saveTextPrimary: { color: '#fff', fontSize: 15, fontWeight: '700' },
    disabledBtn: { opacity: 0.55 },
});
