import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// ==========================================
// INSERT YOUR KEY HERE (usually starts with hf_...)
const HF_API_KEY = "ceva_cheie_hf";
// ==========================================
const MODEL_URL = "https://api-inference.huggingface.co/models/prompthero/openjourney-v4";

export default function Generator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Permission states
    const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);

    // Request permissions on component mount
    useEffect(() => {
        (async () => {
            const mediaStatus = await MediaLibrary.requestPermissionsAsync();
            const pickerStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (mediaStatus.status === 'granted' && pickerStatus.status === 'granted') {
                setHasPermissions(true);
            } else {
                setHasPermissions(false);
            }
        })();
    }, []);

    // Generate image using HuggingFace API
    async function generateImage() {
        if (!prompt) return;
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

            // Convert blob to base64 Data URL for preview
            const result = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(result);
            reader.onloadend = () => {
                setImageUri(reader.result as string);
                setLoading(false);
            };
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not generate the image. Check your connection or API key.");
            setLoading(false);
        }
    }

    // Pick an existing image from the gallery
    async function pickImage() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    }

    // Save the displayed image (AI generated or uploaded) to the gallery
    async function saveToGallery() {
        if (!imageUri) return;

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
        }
    }

    // Open device settings so user can manually grant permissions
    function openSettings() {
        Linking.openSettings();
    }

    // --------------------------------------------------------
    // RENDER: Loading State
    // --------------------------------------------------------
    if (hasPermissions === null) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#00FFFF" />
            </View>
        );
    }

    // --------------------------------------------------------
    // RENDER: Permission Denied Screen
    // --------------------------------------------------------
    if (hasPermissions === false) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.absoluteBackBtn}>
                    <Text style={styles.backText}>[ ◀ BACK ]</Text>
                </TouchableOpacity>

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
            </View>
        );
    }

    // --------------------------------------------------------
    // RENDER: Main App Screen
    // --------------------------------------------------------
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>[ ◀ BACK ]</Text>
            </TouchableOpacity>

            <View style={styles.headerContainer}>
                <Text style={styles.title}>AI TAGGER</Text>
                <Text style={styles.subtitle}>// CREATE OR UPLOAD STICKER</Text>
            </View>

            <View style={styles.previewBox}>
                {loading ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color="#00FFFF" />
                        <Text style={styles.loadingText}>GENERATING... (~15s)</Text>
                    </View>
                ) : imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.img} />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Text style={styles.info}>[ NO STICKER ]</Text>
                        <Text style={styles.subInfo}>Enter a prompt or pick from gallery</Text>
                    </View>
                )}
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: mechanical wolf, neon green"
                    placeholderTextColor="#555"
                    value={prompt}
                    onChangeText={setPrompt}
                />
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.genBtn]}
                    onPress={generateImage}
                    disabled={loading}
                >
                    <Text style={styles.genText}>{loading ? "HACKING..." : "GENERATE AI"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.pickBtn]} onPress={pickImage}>
                    <Text style={styles.pickText}>UPLOAD</Text>
                </TouchableOpacity>
            </View>

            {imageUri && !loading && (
                <TouchableOpacity style={styles.saveBtn} onPress={saveToGallery}>
                    <Text style={styles.saveText}>[ ⬇ SAVE TO GALLERY ]</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#09090B',
        padding: 24,
        alignItems: 'center'
    },
    backBtn: {
        alignSelf: 'flex-start',
        marginTop: 40,
        marginBottom: 20
    },
    absoluteBackBtn: {
        position: 'absolute',
        top: 60,
        left: 24,
    },
    backText: {
        color: '#00FFFF',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    headerContainer: {
        width: '100%',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        paddingBottom: 15,
    },
    title: {
        fontSize: 36,
        color: '#FFF',
        fontWeight: '900',
        letterSpacing: 2,
    },
    subtitle: {
        color: '#888',
        fontSize: 12,
        letterSpacing: 1.5,
        marginTop: 5,
    },
    previewBox: {
        width: '100%',
        height: 350,
        backgroundColor: '#121214',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#00FFFF',
        borderStyle: 'dashed',
    },
    img: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'cover'
    },
    placeholderContainer: {
        alignItems: 'center',
    },
    info: {
        color: '#555',
        fontWeight: 'bold',
        letterSpacing: 1,
        fontSize: 16,
    },
    subInfo: {
        color: '#444',
        fontSize: 12,
        marginTop: 8,
    },
    loadingWrapper: {
        alignItems: 'center'
    },
    loadingText: {
        color: '#00FFFF',
        marginTop: 15,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#121214',
        color: '#FFF',
        width: '100%',
        padding: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    actionBtn: {
        padding: 18,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genBtn: {
        backgroundColor: '#00FFFF',
        flex: 0.65,
        marginRight: 10,
    },
    pickBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#00FFFF',
        flex: 0.35,
    },
    genText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    pickText: {
        color: '#00FFFF',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    saveBtn: {
        backgroundColor: '#39FF14',
        width: '100%',
        padding: 18,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 10,
    },
    saveText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    permissionBox: {
        alignItems: 'center',
        backgroundColor: '#121214',
        padding: 30,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF003C',
    },
    permissionText: {
        color: '#CCC',
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 25,
        lineHeight: 22,
    },
    settingsBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FF003C',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 4,
    },
    settingsBtnText: {
        color: '#FF003C',
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});