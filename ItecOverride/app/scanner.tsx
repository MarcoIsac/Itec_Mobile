/** @jsxImportSource react */
import {
    ViroARImageMarker,
    ViroARScene,
    ViroARSceneNavigator,
    ViroARTrackingTargets
} from '@viro-community/react-viro';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

ViroARTrackingTargets.createTargets({
    "poster_1": { source: require('../assets/posters/afis1.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_2": { source: require('../assets/posters/afis2.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_3": { source: require('../assets/posters/afis3.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_4": { source: require('../assets/posters/afis4.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_5": { source: require('../assets/posters/afis5.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_6": { source: require('../assets/posters/afis6.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_7": { source: require('../assets/posters/afis7.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_8": { source: require('../assets/posters/afis8.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_9": { source: require('../assets/posters/afis9.jpeg'), orientation: "Up", physicalWidth: 0.3 },
    "poster_10": { source: require('../assets/posters/afis10.jpeg'), orientation: "Up", physicalWidth: 0.3 }
});

const PosterARScene = (props: any) => {
    const handleAnchorFound = (posterName: string) => {
        if (props.arSceneNavigator && props.arSceneNavigator.viroAppProps.onPosterFound) {
            props.arSceneNavigator.viroAppProps.onPosterFound(posterName);
        }
    };

    return (
        <ViroARScene>
            <ViroARImageMarker target="poster_1" onAnchorFound={() => handleAnchorFound("Poster 1")} />
            <ViroARImageMarker target="poster_2" onAnchorFound={() => handleAnchorFound("Poster 2")} />
            <ViroARImageMarker target="poster_3" onAnchorFound={() => handleAnchorFound("Poster 3")} />
            <ViroARImageMarker target="poster_4" onAnchorFound={() => handleAnchorFound("Poster 4")} />
            <ViroARImageMarker target="poster_5" onAnchorFound={() => handleAnchorFound("Poster 5")} />
            <ViroARImageMarker target="poster_6" onAnchorFound={() => handleAnchorFound("Poster 6")} />
            <ViroARImageMarker target="poster_7" onAnchorFound={() => handleAnchorFound("Poster 7")} />
            <ViroARImageMarker target="poster_8" onAnchorFound={() => handleAnchorFound("Poster 8")} />
            <ViroARImageMarker target="poster_9" onAnchorFound={() => handleAnchorFound("Poster 9")} />
            <ViroARImageMarker target="poster_10" onAnchorFound={() => handleAnchorFound("Poster 10")} />
        </ViroARScene>
    );
};

export default function ScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const hasFoundPoster = useRef(false);

    // English comment: Mount shield to prevent Expo Router and state updates from clashing
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // English comment: This runs strictly after the component has safely mounted
        setIsMounted(true);
    }, []);

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
                        router.push('/drawScreen');
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
            } catch (error) {
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