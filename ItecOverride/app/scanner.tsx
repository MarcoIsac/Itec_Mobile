import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from "expo-router";
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const router = useRouter();

    // English comment: Ensure hooks are called before any conditional returns
    if (!permission) {
        return <View className="flex-1 bg-[#020617]" />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView className="flex-1 bg-[#020617]">
                <View className="flex-1 justify-center items-center p-10">
                    <Text className="text-blue-100 text-center text-lg mb-8">
                        We need your camera to detect the ITEC posters.
                    </Text>
                    <TouchableOpacity
                        className="bg-blue-600 px-10 py-4 rounded-xl active:bg-blue-700"
                        onPress={requestPermission}
                    >
                        <Text className="text-white font-bold">Enable Camera</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-black">
            {/* English comment: Absolute fill for the camera background */}
            <CameraView
                facing="back"
            />

            {/* Sci-fi Overlay Layer */}
            <SafeAreaView className="flex-1">
                <View className="flex-1 bg-blue-950/30 p-8 justify-between">

                    {/* Top Bar */}
                    <View className="flex-row justify-between items-center">
                        <TouchableOpacity
                            onPress={() => router.push('/')}
                            className="bg-black/60 p-3 px-5 rounded-full border border-white/10"
                        >
                            <Text className="text-white font-bold text-md uppercase">Back</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Central Scanning Viewport */}
                    <View className="items-center justify-center">
                        <View className="w-72 h-96 border border-blue-400/30 rounded-3xl relative">
                            {/* Corner Accents - Styled for precision */}
                            <View className="absolute top-[-2] left-[-2] w-12 h-12 border-t-4 border-l-4 border-blue-400 rounded-tl-3xl" />
                            <View className="absolute top-[-2] right-[-2] w-12 h-12 border-t-4 border-r-4 border-blue-400 rounded-tr-3xl" />
                            <View className="absolute bottom-[-2] left-[-2] w-12 h-12 border-b-4 border-l-4 border-blue-400 rounded-bl-3xl" />
                            <View className="absolute bottom-[-2] right-[-2] w-12 h-12 border-b-4 border-r-4 border-blue-400 rounded-br-3xl" />

                            {/* Scanning Animation Line (Static Placeholder) */}
                            <View className="w-full h-0.5 bg-blue-400/60 mt-32 shadow-lg shadow-blue-400" />
                        </View>

                        <Text className="text-blue-300 mt-8 font-bold tracking-[4px] text-center text-xs uppercase">
                            Targeting Poster...
                        </Text>
                    </View>

                    {/* Bottom Button - Routing fix */}
                    <View className="mb-10 items-center">
                        <TouchableOpacity
                            // IMPORTANT: Ensure the string matches your filename exactly (e.g., 'draw' or 'drawScreen')
                            onPress={() => router.push('/drawScreen')}
                            className="bg-blue-600/20 border border-blue-400/50 px-10 py-4 rounded-full backdrop-blur-xl active:bg-blue-600/40"
                        >
                            <Text className="text-blue-100 font-black tracking-widest text-xs uppercase">
                                Simulate Detection
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
}