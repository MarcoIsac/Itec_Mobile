import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

export default function DrawScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    // UI State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [showUI, setShowUI] = useState(true);

    // Drawing State
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [brushSize, setBrushSize] = useState(10);
    const [paths, setPaths] = useState<Array<{ path: string; color: string; size: number }>>([]);
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    // English comment: Use refs to keep track of current settings inside PanResponder without re-creating it
    const colorRef = useRef(selectedColor);
    const sizeRef = useRef(brushSize);

    useEffect(() => {
        colorRef.current = selectedColor;
        sizeRef.current = brushSize;
    }, [selectedColor, brushSize]);

    // PanResponder handles the touch gestures for drawing
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                // Start new path segment
                setCurrentPath([`M${locationX},${locationY}`]);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                // Update active segment with line commands
                setCurrentPath((prev) => [...prev, `L${locationX},${locationY}`]);
            },
            onPanResponderRelease: (evt, gestureState) => {
                // English comment: We finalize the path using the values from refs to ensure consistency
                setCurrentPath((prevPath) => {
                    if (prevPath.length > 1) {
                        const newPathObj = {
                            path: prevPath.join(' '),
                            color: colorRef.current,
                            size: sizeRef.current
                        };
                        setPaths((oldPaths) => [...oldPaths, newPathObj]);
                    }
                    return [];
                });
            },
        })
    ).current;

    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#ffffff', '#000000'];
    const sizes = [4, 10, 20, 35];

    if (!permission) return <View className="flex-1 bg-black" />;
    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-950 p-6">
                <Text className="text-white text-center mb-6">Camera access is required</Text>
                <TouchableOpacity onPress={requestPermission} className="bg-blue-600 px-8 py-4 rounded-2xl">
                    <Text className="text-white font-bold">Enable Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
            <View className="flex-1 overflow-hidden">
                <CameraView style={StyleSheet.absoluteFill} facing="back" />

                {/* Drawing Surface */}
                <View
                    style={StyleSheet.absoluteFill}
                    {...panResponder.panHandlers}
                    pointerEvents="auto"
                >
                    <Svg style={StyleSheet.absoluteFill}>
                        {/* English comment: Render historical paths first so they stay in the background */}
                        {paths.map((item, index) => (
                            <Path
                                key={`path-${index}-${item.color}`}
                                d={item.path}
                                stroke={item.color}
                                strokeWidth={item.size}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ))}
                        {/* English comment: Render current active stroke */}
                        {currentPath.length > 0 && (
                            <Path
                                d={currentPath.join(' ')}
                                stroke={selectedColor}
                                strokeWidth={brushSize}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}
                    </Svg>
                </View>

                {/* UI Overlay */}
                {showUI && (
                    <View className="absolute top-12 left-4 right-4">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={() => router.replace('/scanner')}
                                className="bg-black/60 items-center justify-center rounded-2xl border border-white/20"
                            >
                                <Text className="text-white text-md m-2">Back to scanner</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setIsModalVisible(true)}
                                className="bg-slate-900/90 backdrop-blur-md p-4 h-12 justify-center rounded-2xl border border-white/20 flex-row items-center"
                            >
                                <View style={{ backgroundColor: selectedColor }} className="w-4 h-4 rounded-full border border-white/40 mr-2" />
                                <Text className="text-white font-bold text-[10px] uppercase">Settings</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPaths([])}
                                className="bg-red-500/80 px-5 py-3 rounded-2xl border border-red-500/40"
                            >
                                <Text className="text-white font-bold text-xs uppercase">Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => setShowUI(!showUI)}
                    className="absolute bottom-12 self-center bg-slate-900/95 px-8 py-3 rounded-full border border-white/10 shadow-2xl"
                >
                    <Text className="text-white/80 text-[10px] font-black tracking-[2px]">
                        {showUI ? 'HIDE OVERLAY' : 'SHOW OVERLAY'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Settings Modal */}
            <Modal animationType="slide" transparent={true} visible={isModalVisible}>
                <View className="flex-1 justify-end bg-black/40">
                    <View className="bg-slate-900 p-8 rounded-t-[40px] border-t border-white/10">
                        <View className="flex-row justify-between items-center mb-10">
                            <Text className="text-white text-2xl font-black italic">BRUSH CONFIG</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} className="bg-blue-600 px-6 py-2 rounded-full">
                                <Text className="text-white font-bold">Done</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-500 mb-4 font-bold uppercase text-[10px]">Select Palette</Text>
                        <View className="flex-row flex-wrap justify-between mb-8">
                            {colors.map((c, i) => (
                                <TouchableOpacity
                                    key={`color-${c}-${i}`}
                                    onPress={() => setSelectedColor(c)}
                                    style={{ backgroundColor: c }}
                                    className={`w-12 h-12 rounded-full mb-4 ${selectedColor === c ? 'border-4 border-white scale-110' : 'border border-white/10 opacity-80'}`}
                                />
                            ))}
                        </View>

                        <Text className="text-slate-500 mb-4 font-bold uppercase text-[10px]">Thickness</Text>
                        <View className="flex-row justify-between bg-black/30 p-6 rounded-3xl items-center">
                            {sizes.map((s) => (
                                <TouchableOpacity
                                    key={`size-${s}`}
                                    onPress={() => setBrushSize(s)}
                                    className={`items-center justify-center rounded-full ${brushSize === s ? 'bg-blue-600/20 w-14 h-14 border border-blue-400' : 'w-12 h-12'}`}
                                >
                                    <View style={{ width: s * 0.7, height: s * 0.7 }} className={`rounded-full ${brushSize === s ? 'bg-blue-400' : 'bg-slate-600'}`} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}