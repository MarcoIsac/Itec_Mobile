import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HF_API_KEY = "";
// Fallback to a highly available, older stable diffusion model to avoid 410 errors on free tier
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1";

const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not process the generated image."));
        reader.onloadend = () => resolve(String(reader.result ?? ""));
        reader.readAsDataURL(blob);
    });

export default function Generator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);

    // Check and request media library permissions
    const checkAndRequestPermissions = async () => {
        const status = await MediaLibrary.getPermissionsAsync();

        if (status.granted) {
            setHasPermissions(true);
            return;
        }

        if (status.canAskAgain) {
            const requested = await MediaLibrary.requestPermissionsAsync();
            setHasPermissions(requested.granted);
        } else {
            setHasPermissions(false);
        }
    };

    useEffect(() => {
        void checkAndRequestPermissions();
    }, []);

    // Generate image using Hugging Face API
    async function generateImage() {
        if (!prompt.trim()) {
            Alert.alert("Missing prompt", "Scrie un prompt inainte de generare.");
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

            // Handle model loading state (Cold Start)
            if (response.status === 503) {
                Alert.alert(
                    "Model is loading",
                    "The AI is waking up. Press generate again in ~15 seconds!"
                );
                setLoading(false);
                return;
            }

            // Handle deprecated or missing model
            if (response.status === 410) {
                throw new Error("Model is no longer available (410). Try replacing MODEL_URL with a different Hugging Face model.");
            }

            if (!response.ok) {
                throw new Error(`HF error ${response.status}`);
            }

            const result = await response.blob();
            const dataUrl = await blobToDataUrl(result);
            setImageUri(dataUrl);
            setLoading(false);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Eroare generare", error.message || "Could not generate the image. Check your connection or API key.");
            setLoading(false);
        }
    }

    // Save the AI generated image to the device gallery
    async function saveToGallery() {
        if (!imageUri) return;
        setSaving(true);

        try {
            let fileUriToSave = imageUri;

            // If the image is a base64 string, write it to a local file first
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
                "Salvat!",
                "Stickerul este in galerie.",
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
            Alert.alert("Info", "Could not open settings automatically.");
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
    // RENDER: Blocked UI (No Permissions)
    // --------------------------------------------------------
    if (!hasPermissions) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.blockedState}>
                    <View style={styles.permissionBoxFull}>
                        <Text style={styles.permissionTitle}>Acces Galerie Necesar</Text>
                        <Text style={styles.permissionText}>
                            Pentru a folosi generatorul si a salva stickere, trebuie sa permiti accesul la galerie din setarile telefonului.
                        </Text>
                        <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
                            <Text style={styles.settingsBtnText}>Deschide Setari</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backBtnAlt} onPress={() => router.back()}>
                            <Text style={styles.backTextAlt}>Inapoi</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // --------------------------------------------------------
    // RENDER: Main App Screen (Permissions Granted)
    // --------------------------------------------------------
    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            {/* KeyboardAvoidingView prevents the keyboard from covering the text input */}
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <View style={styles.topRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>Galerie: Activa</Text>
                        </View>
                    </View>

                    <View style={styles.headerCard}>
                        <Text style={styles.title}>Sticker Generator</Text>
                        <Text style={styles.subtitle}>Genereaza cu Hugging Face, previzualizeaza si salveaza direct pe telefon.</Text>
                    </View>

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
                                <Text style={styles.info}>Niciun sticker generat inca</Text>
                                <Text style={styles.subInfo}>Scrie un prompt mai jos pentru a crea unul.</Text>
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
                            <Text style={styles.genText}>{loading ? "Generare..." : "Genereaza AI"}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, (!imageUri || saving) && styles.disabledBtn]}
                        onPress={saveToGallery}
                        disabled={!imageUri || saving}
                    >
                        <Text style={styles.saveTextPrimary}>{saving ? 'Se salveaza...' : 'Salveaza in galerie'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        backgroundColor: '#020617',
        flex: 1,
    },
    keyboardAvoid: {
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
    blockedState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    permissionBoxFull: {
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderColor: 'rgba(248, 113, 113, 0.35)',
        borderRadius: 18,
        borderWidth: 1,
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    permissionTitle: {
        color: '#fecaca',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 24,
        textAlign: 'center',
    },
    settingsBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    settingsBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    backBtnAlt: {
        paddingVertical: 10,
    },
    backTextAlt: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
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
    previewBox: {
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        borderRadius: 22,
        borderWidth: 1,
        height: 360,
        justifyContent: 'center',
        marginBottom: 16,
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
        flex: 1,
    },
    genText: {
        color: '#fff',
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
    disabledBtn: {
        opacity: 0.55,
    },
});