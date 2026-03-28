import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Your Gemini API Key
const GEMINI_API_KEY = "";
// Using the FREE gemini-2.5-flash-image model with the generateContent endpoint
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;

// Key used to store the array of local file paths
const STICKERS_STORAGE_KEY = '@saved_stickers_paths';

export default function Generator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Generate image using Gemini 2.5 Flash Image
    async function generateImage() {
        if (!prompt.trim()) {
            Alert.alert("Missing prompt", "Write a prompt before generating.");
            return;
        }

        setLoading(true);
        setImageUri(null);
        Keyboard.dismiss();

        try {
            // Append the desired art style to the user's prompt
            const finalPrompt = `${prompt}, cyberpunk graffiti sticker, neon, highly detailed vector art, solid dark background`;

            // Payload structure for Gemini 2.5 Flash Image using generateContent
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: finalPrompt }
                        ]
                    }
                ],
                generationConfig: {
                    // Explicitly tell the model to return an image instead of text
                    responseModalities: ["IMAGE"]
                }
            };

            const response = await fetch(GEMINI_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            // Handle errors from Google's API
            if (!response.ok) {
                throw new Error(data.error?.message || `API error: ${response.status}`);
            }

            // Navigate the nested response to extract the Base64 image data
            const part = data.candidates[0].content.parts[0];

            if (!part.inlineData || !part.inlineData.data) {
                throw new Error("The API did not return valid image data.");
            }

            const base64Image = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || "image/jpeg";

            // Format it to be displayable in React Native's Image component
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            setImageUri(dataUrl);
            setLoading(false);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Generation Error", error.message || "Could not generate the image.");
            setLoading(false);
        }
    }

    // Save the image locally to App Storage
    async function saveToLocalAppStorage() {
        if (!imageUri) return;
        setSaving(true);

        try {
            // Extract the base64 string from the data URL
            const base64Code = imageUri.split("base64,")[1];

            // Create a unique filename
            const fileName = `sticker_${Date.now()}.jpg`;

            // Cast FileSystem to 'any' to bypass the strict TypeScript check for documentDirectory
            const documentDir = (FileSystem as any).documentDirectory;
            const fileUri = `${documentDir}${fileName}`;

            // Write the actual image file to the local file system
            await FileSystem.writeAsStringAsync(fileUri, base64Code, {
                encoding: 'base64'
            });

            // Retrieve the existing array of saved sticker paths from AsyncStorage
            const existingData = await AsyncStorage.getItem(STICKERS_STORAGE_KEY);
            const savedStickers: string[] = existingData ? JSON.parse(existingData) : [];

            // Add the new file path to the array and save it back
            savedStickers.push(fileUri);
            await AsyncStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(savedStickers));

            Alert.alert(
                "Saved Locally!",
                "The sticker was saved inside the app storage successfully.",
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            console.error("Save error:", error);
            Alert.alert("Error", "Could not save the image locally.");
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
                            <Text style={styles.statusPillText}>API: Gemini 2.5 Flash</Text>
                        </View>
                    </View>

                    <View style={styles.headerCard}>
                        <Text style={styles.title}>Sticker Generator</Text>
                        <Text style={styles.subtitle}>Generate and save directly to your app's internal storage.</Text>
                    </View>

                    <View style={styles.previewBox}>
                        {loading ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator size="large" color="#38bdf8" />
                                <Text style={styles.loadingText}>Generating AI image...</Text>
                            </View>
                        ) : imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.img} resizeMode="contain" />
                        ) : (
                            <View style={styles.placeholderContainer}>
                                <Text style={styles.info}>No sticker generated yet</Text>
                                <Text style={styles.subInfo}>Write a prompt below to create one.</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: bold street art fox sticker, blue neon outline"
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
                        onPress={saveToLocalAppStorage}
                        disabled={!imageUri || saving}
                    >
                        <Text style={styles.saveTextPrimary}>{saving ? 'Saving...' : 'Save to App Storage'}</Text>
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
    statusPill: { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: 'rgba(56, 189, 248, 0.4)', borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
    statusPillText: { color: '#bae6fd', fontSize: 13, fontWeight: '700' },
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