import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HF_API_KEY = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY ?? "";
const MODEL_URL = "https://api-inference.huggingface.co/models/prompthero/openjourney-v4";

const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Nu am putut procesa imaginea generata."));
        reader.onloadend = () => resolve(String(reader.result ?? ""));
        reader.readAsDataURL(blob);
    });

export default function Generator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sourceType, setSourceType] = useState<'generated' | 'uploaded' | null>(null);
    const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
    const [canAskAgain, setCanAskAgain] = useState(true);

    const refreshPermissions = async () => {
        const [mediaStatus, pickerStatus] = await Promise.all([
            MediaLibrary.getPermissionsAsync(),
            ImagePicker.getMediaLibraryPermissionsAsync(),
        ]);

        const granted = mediaStatus.granted && pickerStatus.granted;
        setHasPermissions(granted);
        setCanAskAgain(mediaStatus.canAskAgain || pickerStatus.canAskAgain);
        return granted;
    };

    const requestPermissions = async () => {
        const [mediaStatus, pickerStatus] = await Promise.all([
            MediaLibrary.requestPermissionsAsync(),
            ImagePicker.requestMediaLibraryPermissionsAsync(),
        ]);

        const granted = mediaStatus.granted && pickerStatus.granted;
        setHasPermissions(granted);
        setCanAskAgain(mediaStatus.canAskAgain || pickerStatus.canAskAgain);
        return granted;
    };

    const ensureMediaPermissions = async () => {
        const alreadyGranted = await refreshPermissions();
        if (alreadyGranted) return true;

        if (canAskAgain) {
            const granted = await requestPermissions();
            if (granted) return true;
        }

        Alert.alert(
            "Permisiuni necesare",
            "Ai nevoie de acces la galerie pentru upload si salvare. Deschide setarile aplicatiei.",
            [
                { text: "Anuleaza", style: "cancel" },
                { text: "Deschide setari", onPress: openSettings }
            ]
        );
        return false;
    };

    useEffect(() => {
        void refreshPermissions();
    }, []);

    // Generate image using HuggingFace API
    async function generateImage() {
        if (!prompt.trim()) {
            Alert.alert("Prompt lipsa", "Scrie un prompt inainte de generare.");
            return;
        }
        if (!HF_API_KEY) {
            Alert.alert(
                "Lipseste cheia Hugging Face",
                "Seteaza EXPO_PUBLIC_HUGGINGFACE_API_KEY in mediul de runtime."
            );
            return;
        }

        setLoading(true);
        setImageUri(null);
        Keyboard.dismiss();

        try {
            const response = await fetch(MODEL_URL, {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: `${prompt}, cyberpunk graffiti sticker, neon, highly detailed vector art`
                }),
            });

            // Handle model loading state
            if (response.status === 503) {
                Alert.alert(
                    "Model is loading",
                    "The AI is waking up. Press generate again in ~15 seconds!"
                );
                setLoading(false);
                return;
            }
            if (!response.ok) {
                throw new Error(`HF error ${response.status}`);
            }

            const result = await response.blob();
            const dataUrl = await blobToDataUrl(result);
            setImageUri(dataUrl);
            setSourceType('generated');
            setLoading(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not generate the image. Check your connection or API key.");
            setLoading(false);
        }
    }

    // Pick an existing image from the gallery
    async function pickImage() {
        const granted = await ensureMediaPermissions();
        if (!granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setSourceType('uploaded');
        }
    }

    // Save the displayed image (AI generated or uploaded) to the gallery
    async function saveToGallery() {
        if (!imageUri) return;
        const granted = await ensureMediaPermissions();
        if (!granted) return;
        setSaving(true);

        try {
            let fileUriToSave = imageUri;

            // If the image is an AI generated base64 string, write it to a local file first
            if (imageUri.startsWith("data:image")) {
                const base64Code = imageUri.split("base64,")[1];
                const dir = (FileSystem as any).documentDirectory;
                const filename = dir + `itec-tag-${Date.now()}.png`;

                await FileSystem.writeAsStringAsync(filename, base64Code, {
                    encoding: 'base64'
                });
                fileUriToSave = filename;
            }

            await MediaLibrary.saveToLibraryAsync(fileUriToSave);

            Alert.alert(
                "Saved!",
                "The sticker is in your gallery. Tap FIGHT and paste it on the poster!",
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Something went wrong while saving the image.");
        } finally {
            setSaving(false);
        }
    }

    // Open device settings so user can manually grant permissions
    async function openSettings() {
        try {
            await Linking.openSettings();
        } catch {
            Alert.alert("Info", "Nu am putut deschide setarile automat.");
        }
    }

    // --------------------------------------------------------
    // RENDER: Loading State
    // --------------------------------------------------------
    if (hasPermissions === null) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color="#38bdf8" />
                    <Text style={styles.loadingStateText}>Verificam permisiunile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // --------------------------------------------------------
    // RENDER: Permission Denied Screen
    // --------------------------------------------------------
    if (false && hasPermissions === false) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.loadingState}>
                    <Text style={styles.backText}>[ ◀ BACK ]</Text>
                </View>

                <View style={styles.permissionBox}>
                    <Text style={styles.title}>SYSTEM LOCKED</Text>
                    <Text style={styles.permissionText}>
                        We need access to your gallery to upload and save stickers.
                        Please grant permissions in your device settings.
                    </Text>

                    <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
                        <Text style={styles.settingsBtnText}>[ OPEN SETTINGS ]</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // --------------------------------------------------------
    // RENDER: Main App Screen
    // --------------------------------------------------------
    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {false && (
                <Text style={styles.backText}>[ ◀ BACK ]</Text>
            )}

                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                            {hasPermissions ? 'Galerie: activa' : 'Galerie: blocata'}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerCard}>
                    <Text style={styles.title}>Sticker Generator</Text>
                    <Text style={styles.subtitle}>Genereaza cu Hugging Face, previzualizeaza si salveaza direct pe telefon.</Text>
                </View>

                {!hasPermissions && (
                    <View style={styles.permissionBox}>
                        <Text style={styles.permissionTitle}>Permisiunea de galerie nu este activa.</Text>
                        <Text style={styles.permissionText}>
                            Upload si salvare necesita acces la galerie. Poti continua sa generezi, apoi activezi accesul din setari.
                        </Text>
                        <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
                            <Text style={styles.settingsBtnText}>Deschide setari</Text>
                        </TouchableOpacity>
                    </View>
                )}

            <View style={styles.previewBox}>
                {loading ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color="#38bdf8" />
                        <Text style={styles.loadingText}>Generam imaginea...</Text>
                    </View>
                ) : imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.img} />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Text style={styles.info}>Nu exista inca un sticker generat</Text>
                        <Text style={styles.subInfo}>Scrie un prompt sau incarca o imagine din galerie.</Text>
                    </View>
                )}
            </View>

                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                        Sursa: {sourceType === 'generated' ? 'Hugging Face' : sourceType === 'uploaded' ? 'Galerie' : 'N/A'}
                    </Text>
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
                    <Text style={styles.genText}>{loading ? "Generare..." : "Genereaza AI"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.pickBtn]} onPress={pickImage}>
                    <Text style={styles.pickText}>Upload</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, (!imageUri || saving) && styles.disabledBtn]}
                onPress={saveToGallery}
                disabled={!imageUri || saving}
            >
                <Text style={styles.saveTextPrimary}>{saving ? 'Se salveaza...' : 'Salveaza in galerie'}</Text>
                    <Text style={styles.saveText}>[ ⬇ SAVE TO GALLERY ]</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        backgroundColor: '#020617',
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 28,
    },
    loadingState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    loadingStateText: {
        color: '#cbd5e1',
        fontSize: 14,
        marginTop: 12,
    },
    topRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    backBtn: {
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    backText: {
        color: '#f8fafc',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statusPill: {
        backgroundColor: 'rgba(8, 47, 73, 0.92)',
        borderColor: 'rgba(125, 211, 252, 0.28)',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    statusPillText: {
        color: '#bae6fd',
        fontSize: 12,
        fontWeight: '700',
    },
    headerCard: {
        backgroundColor: 'rgba(2, 6, 23, 0.82)',
        borderColor: 'rgba(125, 211, 252, 0.18)',
        borderRadius: 22,
        borderWidth: 1,
        marginBottom: 14,
        padding: 16,
    },
    title: {
        color: '#f8fafc',
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 6,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 14,
        lineHeight: 20,
    },
    permissionBox: {
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderColor: 'rgba(248, 113, 113, 0.35)',
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 14,
        padding: 14,
    },
    permissionTitle: {
        color: '#fecaca',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    permissionText: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
    },
    settingsBtn: {
        alignSelf: 'flex-start',
        backgroundColor: '#991b1b',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    settingsBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    previewBox: {
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        borderRadius: 22,
        borderWidth: 1,
        height: 360,
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },
    img: {
        height: '100%',
        width: '100%',
    },
    placeholderContainer: {
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    info: {
        color: '#cbd5e1',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    subInfo: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },
    loadingWrapper: {
        alignItems: 'center',
    },
    loadingText: {
        color: '#bae6fd',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 12,
    },
    metaRow: {
        marginBottom: 12,
    },
    metaText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    inputContainer: {
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 16,
        borderWidth: 1,
        color: '#f8fafc',
        fontSize: 15,
        minHeight: 88,
        padding: 14,
        textAlignVertical: 'top',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    actionBtn: {
        alignItems: 'center',
        borderRadius: 16,
        justifyContent: 'center',
        paddingVertical: 14,
    },
    genBtn: {
        backgroundColor: '#2563eb',
        flex: 0.65,
    },
    pickBtn: {
        backgroundColor: '#0f172a',
        borderColor: '#38bdf8',
        borderWidth: 1,
        flex: 0.35,
    },
    genText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    pickText: {
        color: '#e0f2fe',
        fontSize: 15,
        fontWeight: '700',
    },
    saveBtn: {
        alignItems: 'center',
        backgroundColor: '#16a34a',
        borderRadius: 16,
        justifyContent: 'center',
        paddingVertical: 14,
    },
    saveTextPrimary: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    saveText: {
        color: 'transparent',
        fontSize: 0,
        height: 0,
    },
    disabledBtn: {
        opacity: 0.55,
    },
});
