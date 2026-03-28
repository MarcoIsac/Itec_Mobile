import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ActivityIndicator, Keyboard, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// ==========================================
// PUNE CHEIA TA AICI! (începe de obicei cu hf_...)
const HF_API_KEY = "PUNE_CHEIA_TA_HUGGING_FACE_AICI";
// ==========================================
const MODEL_URL = "https://api-inference.huggingface.co/models/prompthero/openjourney-v4";

export default function Generator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function generateImage() {
        if (!prompt) return;
        setLoading(true);
        setImageUri(null);
        Keyboard.dismiss();

        try {
            const response = await fetch(MODEL_URL, {
                headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `${prompt}, cyberpunk graffiti sticker, neon, highly detailed vector art` }),
            });

            if (response.status === 503) {
                Alert.alert("Modelul se încarcă", "AI-ul se trezește. Mai apasă o dată butonul de generare în 15 secunde!");
                setLoading(false);
                return;
            }

            const result = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(result);
            reader.onloadend = () => {
                setImageUri(reader.result as string);
                setLoading(false);
            };
        } catch (error) {
            console.error(error);
            Alert.alert("Eroare", "Nu am putut genera imaginea. Verifică conexiunea sau cheia API.");
            setLoading(false);
        }
    }

    async function saveToGallery() {
        if (!imageUri) return;

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Eroare", "Avem nevoie de acces la galerie pentru a salva stickerul.");
                return;
            }

            const base64Code = imageUri.split("base64,")[1];
            const filename = FileSystem.documentDirectory + `itec-tag-${Date.now()}.png`;

            await FileSystem.writeAsStringAsync(filename, base64Code, {
                // @ts-ignore
                encoding: FileSystem.EncodingType.Base64});

            await MediaLibrary.saveToLibraryAsync(filename);

            Alert.alert(
                "Salvat!",
                "Stickerul este în galeria ta. Apasă pe FIGHT și lipește-l pe poster!",
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            console.error(error);
            Alert.alert("Eroare", "Ceva a mers prost la salvarea imaginii.");
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>◀ ÎNAPOI</Text>
            </TouchableOpacity>

            <Text style={styles.title}>AI TAGGER</Text>

            <View style={styles.previewBox}>
                {loading ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color="#00f0ff" />
                        <Text style={styles.loadingText}>Creăm stickerul... (~15s)</Text>
                    </View>
                ) : imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.img} />
                ) : (
                    <Text style={styles.info}>Descrie stickerul tău mai jos</Text>
                )}
            </View>

            <TextInput
                style={styles.input}
                placeholder="Ex: un lup mecanic, neon verde"
                placeholderTextColor="#666"
                value={prompt}
                onChangeText={setPrompt}
            />

            <TouchableOpacity style={styles.genBtn} onPress={generateImage} disabled={loading}>
                <Text style={styles.genText}>{loading ? "SE GENERARE..." : "GENEREAZĂ"}</Text>
            </TouchableOpacity>

            {imageUri && !loading && (
                <TouchableOpacity style={styles.saveBtn} onPress={saveToGallery}>
                    <Text style={styles.saveText}>⬇ SALVEAZĂ ÎN GALERIE</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#0a0a0a', padding: 25, alignItems: 'center' },
    backBtn: { alignSelf: 'flex-start', marginTop: 40, marginBottom: 20 },
    backText: { color: '#888', fontWeight: 'bold' },
    title: { fontSize: 32, color: '#fff', fontWeight: '900', marginBottom: 20 },
    previewBox: { width: '100%', height: 350, backgroundColor: '#111', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    img: { width: '100%', height: '100%', borderRadius: 15, resizeMode: 'cover' },
    info: { color: '#444', textAlign: 'center' },
    loadingWrapper: { alignItems: 'center' },
    loadingText: { color: '#00f0ff', marginTop: 10, fontWeight: 'bold' },
    input: { backgroundColor: '#1a1a1a', color: '#fff', width: '100%', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    genBtn: { backgroundColor: '#00f0ff', width: '100%', padding: 18, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
    genText: { color: '#000', fontWeight: '900', fontSize: 18 },
    saveBtn: { backgroundColor: '#39ff14', width: '100%', padding: 18, borderRadius: 10, alignItems: 'center' },
    saveText: { color: '#000', fontWeight: '900', fontSize: 18 },
});