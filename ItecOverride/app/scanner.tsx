// @ts-ignore
import {
    ViroARImageMarker,
    ViroARScene,
    ViroARSceneNavigator,
    ViroText
} from '@reactvision/react-viro';
import Constants from 'expo-constants';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, InteractionManager, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PosterId } from './lib/ar-types';
import { POSTERS, POSTER_MAP } from './lib/posters';
import { ensureViroTargets } from './lib/viro-init';

ensureViroTargets();

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const PosterARScene = (props: any) => {
    const onPosterFound = props.arSceneNavigator.viroAppProps.onPosterFound as (posterId: PosterId) => void;

    return (
        <ViroARScene>
            {POSTERS.map((poster) => (
                <ViroARImageMarker
                    key={poster.id}
                    target={poster.target}
                    onAnchorFound={() => onPosterFound(poster.id)}
                >
                    <ViroText
                        text={poster.label}
                        position={[0, 0.22, 0]}
                        scale={[0.08, 0.08, 0.08]}
                        style={styles.arLabel}
                    />
                </ViroARImageMarker>
            ))}
        </ViroARScene>
    );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const hasFoundPoster = useRef(false);
    const isMounted = true;

    const handlePosterDetection = (posterName: string) => {
        if (hasFoundPoster.current) return;
        hasFoundPoster.current = true;

        Alert.alert(
            "Target Acquired!",
            `Sistemul a detectat: ${posterName}. Inițiem modulul de desenare...`,
            [
                {
                    text: "Continuă",
                    onPress: () => {
                        hasFoundPoster.current = false;
                        router.push('/drawScreen' as any);
                    }
                }
            ],
            { cancelable: false }
        );
    };

    const handleEnableCamera = async () => {
        if (permission && !permission.canAskAgain) {
            try {
                await Linking.openSettings();
            } catch {
                Alert.alert(
                    "Acțiune necesară",
                    "Nu am putut deschide setările automat. Te rugăm să mergi manual la Setările telefonului -> Aplicații -> Caută aplicația și activează permisiunea pentru Cameră."
                );
            }
        } else {
            await requestPermission();
        }
    };

    // English comment: Do not render ANYTHING heavy or check permissions until safely mounted
    if (!isMounted || !permission) {
        return <View style={{ flex: 1, backgroundColor: '#020617' }} />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Text style={{ color: '#dbeafe', textAlign: 'center', fontSize: 18, marginBottom: 32 }}>
                        We need your camera to detect the ITEC posters.
                    </Text>
                    <TouchableOpacity
                        style={{ backgroundColor: '#2563eb', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 12 }}
                        onPress={handleEnableCamera}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Enable Camera</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <ViroARSceneNavigator
                autofocus={true}
                initialScene={{ scene: PosterARScene as any }}
                style={StyleSheet.absoluteFill}
                viroAppProps={{ onPosterFound: handlePosterDetection }}
            />

            <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <View style={{ flex: 1, backgroundColor: 'rgba(23, 37, 84, 0.3)', padding: 32, justifyContent: 'space-between' }} pointerEvents="box-none">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => router.push('/')}
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>Back</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                        <View style={{ width: 288, height: 384, borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.3)', borderRadius: 24, position: 'relative' }}>
                            <View style={{ position: 'absolute', top: -2, left: -2, width: 48, height: 48, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#60a5fa', borderTopLeftRadius: 24 }} />
                            <View style={{ position: 'absolute', top: -2, right: -2, width: 48, height: 48, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#60a5fa', borderTopRightRadius: 24 }} />
                            <View style={{ position: 'absolute', bottom: -2, left: -2, width: 48, height: 48, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#60a5fa', borderBottomLeftRadius: 24 }} />
                            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 48, height: 48, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#60a5fa', borderBottomRightRadius: 24 }} />
                            <View style={{ width: '100%', height: 2, backgroundColor: 'rgba(96, 165, 250, 0.6)', marginTop: 128 }} />
                        </View>
                        <Text style={{ color: '#93c5fd', marginTop: 32, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center', fontSize: 12, textTransform: 'uppercase' }}>
                            Targeting Poster...
                        </Text>
                    </View>

                    <View style={{ marginBottom: 40, alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => handlePosterDetection("Manual Override Poster")}
                            style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.5)', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999 }}
                        >
                            <Text style={{ color: '#dbeafe', fontWeight: '900', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>
                                Simulate Detection
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView >
        </View >
    );
}

export default function ScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const isNavigatingRef = useRef(false);
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
        }
    }, []);

    const openPoster = (posterId: PosterId) => {
        if (isNavigatingRef.current) return;

        isNavigatingRef.current = true;
        setIsTransitioning(true);

        if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
        }

        transitionTimerRef.current = setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
                router.replace({
                    pathname: '/drawScreen' as any,
                    params: { posterId },
                });
            });
        }, 320);
    };

    if (!permission) {
        return <View style={styles.loadingScreen} />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permissionScreen}>
                <View style={styles.permissionCard}>
                    <Text style={styles.permissionTitle}>Camera este necesara pentru scanarea posterelor.</Text>
                    <Text style={styles.permissionBody}>
                        Dupa accept, build-ul nativ poate detecta automat imaginile din `assets/posters`.
                    </Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Permite camera</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {isExpoGo ? (
                <CameraView facing="back" style={StyleSheet.absoluteFill} />
            ) : isTransitioning ? (
                <View style={[StyleSheet.absoluteFill, styles.transitionBackdrop]} />
            ) : (
                <ViroARSceneNavigator
                    autofocus
                    initialScene={{ scene: PosterARScene as any }}
                    viroAppProps={{ onPosterFound: openPoster }}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <View style={styles.overlay} pointerEvents="box-none">
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => router.replace('/')} style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>Back</Text>
                        </TouchableOpacity>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>{isExpoGo ? 'Expo Go Preview' : 'AR Scan Live'}</Text>
                        </View>
                    </View>

                    <View style={styles.scanFrameWrapper} pointerEvents="none">
                        <View style={styles.scanFrame}>
                            <View style={[styles.frameCorner, styles.topLeft]} />
                            <View style={[styles.frameCorner, styles.topRight]} />
                            <View style={[styles.frameCorner, styles.bottomLeft]} />
                            <View style={[styles.frameCorner, styles.bottomRight]} />
                            <View style={styles.scanLine} />
                        </View>
                        <Text style={styles.scanHint}>
                            {isExpoGo
                                ? 'Expo Go afiseaza preview-ul camerei. Pentru detectie AR automata foloseste npx expo run:android.'
                                : 'Tine posterul in cadru pana este detectat automat.'}
                        </Text>
                    </View>

                    <View style={styles.posterChooser}>
                        <Text style={styles.posterChooserTitle}>Alege manual posterul</Text>
                        <Text style={styles.posterChooserSubtitle}>
                            Fallback-ul ramane disponibil daca marker-ul nu este prins imediat.
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterList}>
                            {POSTERS.map((poster) => (
                                <TouchableOpacity
                                    key={poster.id}
                                    onPress={() => openPoster(poster.id)}
                                    style={styles.posterChip}
                                >
                                    <Text style={styles.posterChipLabel}>{POSTER_MAP[poster.id].label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    arLabel: {
        color: '#f8fafc',
        fontFamily: 'Arial',
        fontSize: 20,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    bottomLeft: {
        borderBottomLeftRadius: 24,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        bottom: -2,
        left: -2,
    },
    bottomRight: {
        borderBottomRightRadius: 24,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        bottom: -2,
        right: -2,
    },
    container: {
        backgroundColor: '#020617',
        flex: 1,
    },
    frameCorner: {
        borderColor: '#38bdf8',
        height: 48,
        position: 'absolute',
        width: 48,
    },
    loadingScreen: {
        backgroundColor: '#020617',
        flex: 1,
    },
    overlay: {
        backgroundColor: 'rgba(2, 6, 23, 0.22)',
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
    },
    permissionBody: {
        color: '#cbd5e1',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 24,
        textAlign: 'center',
    },
    permissionCard: {
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 28,
        borderWidth: 1,
        marginHorizontal: 20,
        padding: 24,
    },
    permissionScreen: {
        backgroundColor: '#020617',
        flex: 1,
        justifyContent: 'center',
    },
    permissionTitle: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    posterChip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(125, 211, 252, 0.35)',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    posterChipLabel: {
        color: '#e0f2fe',
        fontSize: 13,
        fontWeight: '700',
    },
    posterChooser: {
        backgroundColor: 'rgba(2, 6, 23, 0.82)',
        borderColor: 'rgba(125, 211, 252, 0.18)',
        borderRadius: 28,
        borderWidth: 1,
        padding: 18,
    },
    posterChooserSubtitle: {
        color: '#94a3b8',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 14,
    },
    posterChooserTitle: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    posterList: {
        gap: 12,
        paddingRight: 20,
    },
    primaryButton: {
        backgroundColor: '#2563eb',
        borderRadius: 18,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    scanFrame: {
        borderColor: 'rgba(125, 211, 252, 0.32)',
        borderRadius: 28,
        borderWidth: 1,
        height: 420,
        overflow: 'hidden',
        position: 'relative',
        width: 290,
    },
    scanFrameWrapper: {
        alignItems: 'center',
    },
    scanHint: {
        color: '#e0f2fe',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 20,
        marginTop: 20,
        maxWidth: 310,
        textAlign: 'center',
    },
    scanLine: {
        backgroundColor: 'rgba(56, 189, 248, 0.7)',
        height: 2,
        marginTop: 160,
        width: '100%',
    },
    secondaryButton: {
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
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
        textTransform: 'uppercase',
    },
    topBar: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    topLeft: {
        borderLeftWidth: 4,
        borderTopLeftRadius: 24,
        borderTopWidth: 4,
        left: -2,
        top: -2,
    },
    topRight: {
        borderRightWidth: 4,
        borderTopRightRadius: 24,
        borderTopWidth: 4,
        right: -2,
        top: -2,
    },
    transitionBackdrop: {
        backgroundColor: '#000',
    },
});
