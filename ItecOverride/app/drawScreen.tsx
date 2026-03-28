import { CameraView, useCameraPermissions } from 'expo-camera';
// @ts-ignore
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { getDeviceId, getServerUrl, loadPosterContent, savePosterContent } from './lib/ar-store';
import type { NormalizedPoint, PosterContent, PosterId, StickerRecord, StrokeRecord } from './lib/ar-types';
import { isPosterId, POSTER_MAP } from './lib/posters';

type DraftSticker = {
    base64: string;
    height: number;
    id: string;
    imageUri?: string;
    mimeType: string;
    position: NormalizedPoint;
    scale: number;
    uri: string;
    width: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createEmptyContent = (posterId: PosterId): PosterContent => ({
    posterId,
    stickers: [],
    strokes: [],
    updatedAt: new Date(0).toISOString(),
});

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toCanvasPoint = (point: NormalizedPoint, width: number, height: number) => ({
    x: point.x * width,
    y: point.y * height,
});

const buildSvgPath = (points: NormalizedPoint[], width: number, height: number) => {
    if (!points.length) return '';

    return points
        .map((point, index) => {
            const canvasPoint = toCanvasPoint(point, width, height);
            return `${index === 0 ? 'M' : 'L'}${canvasPoint.x},${canvasPoint.y}`;
        })
        .join(' ');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyDrawScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    // UI State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [showUI, setShowUI] = useState(true);

    // Drawing State
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [brushSize, setBrushSize] = useState(10);
    const [paths, setPaths] = useState<{ path: string; color: string; size: number }[]>([]);
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
                                onPress={() => router.replace('/scanner' as any)}
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

export default function DrawScreen() {
    const router = useRouter();
    const { posterId: rawPosterId } = useLocalSearchParams<{ posterId?: string }>();
    const posterId = isPosterId(rawPosterId) ? rawPosterId : null;
    const poster = posterId ? POSTER_MAP[posterId] : null;
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const canvasWidth = screenWidth;
    const canvasHeight = screenHeight;

    const [authorId, setAuthorId] = useState('');
    const [content, setContent] = useState<PosterContent | null>(posterId ? createEmptyContent(posterId) : null);
    const [draftStrokes, setDraftStrokes] = useState<StrokeRecord[]>([]);
    const [currentStroke, setCurrentStroke] = useState<NormalizedPoint[]>([]);
    const [draftSticker, setDraftSticker] = useState<DraftSticker | null>(null);
    const [selectedColor, setSelectedColor] = useState('#38bdf8');
    const [brushSize, setBrushSize] = useState(12);
    const [tool, setTool] = useState<'draw' | 'sticker'>('draw');
    const [isBusy, setIsBusy] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSync, setLastSync] = useState('');
    const canvasLayoutRef = useRef({ x: 0, y: 0, width: canvasWidth, height: canvasHeight });
    const stickerStartRef = useRef<NormalizedPoint | null>(null);

    useEffect(() => {
        if (!posterId) return;

        let isActive = true;

        const hydrate = async () => {
            setIsBusy(true);
            const [resolvedAuthorId, resolvedContent] = await Promise.all([getDeviceId(), loadPosterContent(posterId)]);
            if (!isActive) return;

            setAuthorId(resolvedAuthorId);
            setContent(resolvedContent);
            setLastSync(new Date().toISOString());
            setIsBusy(false);
        };

        void hydrate();

        const syncTimer = setInterval(async () => {
            const refreshed = await loadPosterContent(posterId);
            if (!isActive) return;

            setContent(refreshed);
            setLastSync(new Date().toISOString());
        }, 5000);

        return () => {
            isActive = false;
            clearInterval(syncTimer);
        };
    }, [posterId]);

    const colors = ['#38bdf8', '#ef4444', '#22c55e', '#f59e0b', '#f8fafc', '#0f172a'];
    const brushSizes = [6, 12, 20, 28];

    const combinedStrokes = useMemo(
        () => [...(content?.strokes ?? []), ...draftStrokes],
        [content?.strokes, draftStrokes]
    );

    const combinedStickers = useMemo(
        () => [...(content?.stickers ?? []), ...(draftSticker ? [draftSticker] : [])],
        [content?.stickers, draftSticker]
    );

    const normalizeTouchPoint = (x: number, y: number): NormalizedPoint => {
        const { width, height } = canvasLayoutRef.current;
        if (width <= 0 || height <= 0) {
            return { x: 0.5, y: 0.5 };
        }

        return {
            x: clamp(x / width, 0, 1),
            y: clamp(y / height, 0, 1),
        };
    };

    const drawingPanResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => tool === 'draw',
        onMoveShouldSetPanResponder: () => tool === 'draw',
        onStartShouldSetPanResponderCapture: () => tool === 'draw',
        onStartShouldSetPanResponder: () => tool === 'draw',
        onPanResponderGrant: (event) => {
            if (tool !== 'draw') return;
            setCurrentStroke([normalizeTouchPoint(event.nativeEvent.locationX, event.nativeEvent.locationY)]);
        },
        onPanResponderMove: (event) => {
            if (tool !== 'draw') return;
            setCurrentStroke((previous) => [...previous, normalizeTouchPoint(event.nativeEvent.locationX, event.nativeEvent.locationY)]);
        },
        onPanResponderRelease: () => {
            setCurrentStroke((strokePoints) => {
                if (strokePoints.length < 2) return [];

                setDraftStrokes((previous) => [
                    ...previous,
                    {
                        authorId,
                        color: selectedColor,
                        createdAt: new Date().toISOString(),
                        id: createId('stroke'),
                        points: strokePoints,
                        size: brushSize,
                    }
                ]);

                return [];
            });
        },
    }), [authorId, brushSize, selectedColor, tool]);

    const stickerPanResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => tool === 'sticker' && !!draftSticker,
        onMoveShouldSetPanResponder: () => tool === 'sticker' && !!draftSticker,
        onStartShouldSetPanResponderCapture: () => tool === 'sticker' && !!draftSticker,
        onStartShouldSetPanResponder: () => tool === 'sticker' && !!draftSticker,
        onPanResponderGrant: () => {
            stickerStartRef.current = draftSticker?.position ?? null;
        },
        onPanResponderMove: (_event, gestureState) => {
            if (!draftSticker || !stickerStartRef.current) return;

            const width = canvasLayoutRef.current.width;
            const height = canvasLayoutRef.current.height;

            setDraftSticker((previous) => previous ? {
                ...previous,
                position: {
                    x: clamp(stickerStartRef.current!.x + gestureState.dx / width, 0.08, 0.92),
                    y: clamp(stickerStartRef.current!.y + gestureState.dy / height, 0.08, 0.92),
                }
            } : null);
        },
    }), [draftSticker, tool]);

    const pickSticker = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permisiune necesara', 'Trebuie permis accesul la galerie pentru a adauga stickere.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            base64: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.75,
        });

        if (result.canceled || !result.assets[0]?.base64) return;

        const asset = result.assets[0];
        const ratio = asset.width && asset.height ? asset.width / asset.height : 1;

        setDraftSticker({
            base64: asset.base64 ?? '',
            height: 0.2,
            id: createId('draft-sticker'),
            imageUri: asset.uri,
            mimeType: asset.mimeType ?? 'image/jpeg',
            position: { x: 0.5, y: 0.5 },
            scale: 1,
            uri: asset.uri,
            width: clamp(0.2 * ratio, 0.12, 0.45),
        });
        setTool('sticker');
    };

    const nudgeDraftSticker = (deltaX: number, deltaY: number) => {
        setDraftSticker((previous) => previous ? {
            ...previous,
            position: {
                x: clamp(previous.position.x + deltaX, 0.08, 0.92),
                y: clamp(previous.position.y + deltaY, 0.08, 0.92),
            },
        } : null);
    };

    const submitChanges = async () => {
        if (!posterId || !content) return;
        if (!draftStrokes.length && !draftSticker) return;

        setIsSaving(true);

        const nextStickers: StickerRecord[] = draftSticker
            ? [
                ...content.stickers,
                {
                    authorId,
                    createdAt: new Date().toISOString(),
                    id: createId('sticker'),
                    imageData: draftSticker.base64,
                    mimeType: draftSticker.mimeType,
                    position: draftSticker.position,
                    scale: draftSticker.scale,
                    width: draftSticker.width,
                    height: draftSticker.height,
                }
            ]
            : content.stickers;

        const nextContent: PosterContent = {
            ...content,
            stickers: nextStickers,
            strokes: [...content.strokes, ...draftStrokes],
            updatedAt: new Date().toISOString(),
        };

        const saved = await savePosterContent(nextContent);
        setContent(saved);
        setDraftStrokes([]);
        setCurrentStroke([]);
        setDraftSticker(null);
        setLastSync(new Date().toISOString());
        setIsSaving(false);
    };

    if (!posterId || !poster) {
        return (
            <SafeAreaView style={drawStyles.invalidScreen}>
                <Text style={drawStyles.invalidTitle}>Poster invalid</Text>
                <TouchableOpacity onPress={() => router.replace('/scanner' as any)} style={drawStyles.primaryAction}>
                    <Text style={drawStyles.primaryActionText}>Inapoi la scanner</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (isBusy || !content) {
        return (
            <SafeAreaView style={drawStyles.loadingWrapper}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={drawStyles.loadingText}>Incarcam continutul pentru {poster.label}...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={drawStyles.screen} edges={['top', 'bottom']}>
            <View style={drawStyles.sceneWrapper}>
                <CameraView facing="back" style={StyleSheet.absoluteFill} />

                <View style={drawStyles.sceneShade} pointerEvents="none" />

                <View
                    style={drawStyles.canvasStage}
                    onLayout={(event) => {
                        const layout = event.nativeEvent.layout;
                        canvasLayoutRef.current = {
                            x: layout.x,
                            y: layout.y,
                            width: layout.width,
                            height: layout.height,
                        };
                    }}
                >
                    <Image source={poster.source} style={drawStyles.posterPreviewImage} resizeMode="cover" />

                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        {combinedStrokes.map((stroke) => (
                            <Path
                                key={stroke.id}
                                d={buildSvgPath(stroke.points, canvasWidth, canvasHeight)}
                                stroke={stroke.color}
                                strokeWidth={stroke.size}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ))}
                        {currentStroke.length > 1 && (
                            <Path
                                d={buildSvgPath(currentStroke, canvasWidth, canvasHeight)}
                                stroke={selectedColor}
                                strokeWidth={brushSize}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}
                    </Svg>

                    {combinedStickers.map((sticker) => {
                        const stickerWidth = sticker.width * sticker.scale * canvasWidth;
                        const stickerHeight = sticker.height * sticker.scale * canvasHeight;
                        const left = sticker.position.x * canvasWidth - stickerWidth / 2;
                        const top = sticker.position.y * canvasHeight - stickerHeight / 2;

                        return (
                            <Image
                                key={sticker.id}
                                source={{ uri: sticker.imageUri ?? sticker.uri }}
                                style={[drawStyles.stickerPreview, { height: stickerHeight, left, top, width: stickerWidth }]}
                                resizeMode="contain"
                            />
                        );
                    })}

                    <View
                        style={StyleSheet.absoluteFill}
                        {...drawingPanResponder.panHandlers}
                        pointerEvents={tool === 'draw' ? 'auto' : 'none'}
                    />
                    <View
                        style={StyleSheet.absoluteFill}
                        {...stickerPanResponder.panHandlers}
                        pointerEvents={tool === 'sticker' && draftSticker ? 'auto' : 'none'}
                    />
                </View>

                <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <View style={drawStyles.topControls}>
                        <TouchableOpacity onPress={() => router.replace('/scanner' as any)} style={drawStyles.floatingButton}>
                            <Text style={drawStyles.floatingButtonText}>Back</Text>
                        </TouchableOpacity>
                        <View style={drawStyles.statusBox}>
                            <Text style={drawStyles.statusHeadline}>{poster.label}</Text>
                            <Text style={drawStyles.statusSubline}>
                                Preview 2D full-screen pentru desen si stickere.
                            </Text>
                        </View>
                    </View>

                    <View style={drawStyles.bottomSheet}>
                        <ScrollView contentContainerStyle={drawStyles.bottomSheetContent}>
                            <View style={drawStyles.toolbarRow}>
                                <TouchableOpacity
                                    onPress={() => setTool('draw')}
                                    style={[drawStyles.modeChip, tool === 'draw' && drawStyles.modeChipActive]}
                                >
                                    <Text style={[drawStyles.modeChipText, tool === 'draw' && drawStyles.modeChipTextActive]}>Desen</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={pickSticker}
                                    style={[drawStyles.modeChip, tool === 'sticker' && drawStyles.modeChipActive]}
                                >
                                    <Text style={[drawStyles.modeChipText, tool === 'sticker' && drawStyles.modeChipTextActive]}>Sticker</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDraftStrokes([]);
                                        setCurrentStroke([]);
                                        setDraftSticker(null);
                                    }}
                                    style={drawStyles.modeChip}
                                >
                                    <Text style={drawStyles.modeChipText}>Anuleaza draft</Text>
                                </TouchableOpacity>
                            </View>

                            {tool === 'draw' && (
                                <>
                                    <Text style={drawStyles.sectionLabel}>Paleta</Text>
                                    <View style={drawStyles.paletteRow}>
                                        {colors.map((color) => (
                                            <TouchableOpacity
                                                key={color}
                                                onPress={() => setSelectedColor(color)}
                                                style={[
                                                    drawStyles.colorSwatch,
                                                    { backgroundColor: color },
                                                    selectedColor === color && drawStyles.colorSwatchActive,
                                                ]}
                                            />
                                        ))}
                                    </View>

                                    <Text style={drawStyles.sectionLabel}>Grosime</Text>
                                    <View style={drawStyles.brushRow}>
                                        {brushSizes.map((size) => (
                                            <TouchableOpacity
                                                key={size}
                                                onPress={() => setBrushSize(size)}
                                                style={[drawStyles.brushChip, brushSize === size && drawStyles.brushChipActive]}
                                            >
                                                <View
                                                    style={{
                                                        backgroundColor: brushSize === size ? '#38bdf8' : '#64748b',
                                                        borderRadius: 999,
                                                        height: size,
                                                        width: size,
                                                    }}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {tool === 'sticker' && (
                                <>
                                    <Text style={drawStyles.sectionLabel}>Redimensionare sticker</Text>
                                    <View style={drawStyles.stickerScaleRow}>
                                        <TouchableOpacity
                                            onPress={() => setDraftSticker((previous) => previous ? { ...previous, scale: clamp(previous.scale - 0.15, 0.4, 2.5) } : null)}
                                            style={drawStyles.scaleButton}
                                        >
                                            <Text style={drawStyles.scaleButtonText}>Mai mic</Text>
                                        </TouchableOpacity>
                                        <Text style={drawStyles.scaleValue}>
                                            {draftSticker ? `${Math.round(draftSticker.scale * 100)}%` : 'Alege o imagine'}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setDraftSticker((previous) => previous ? { ...previous, scale: clamp(previous.scale + 0.15, 0.4, 2.5) } : null)}
                                            style={drawStyles.scaleButton}
                                        >
                                            <Text style={drawStyles.scaleButtonText}>Mai mare</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={drawStyles.sectionLabel}>Mutare sticker (X / Y)</Text>
                                    <View style={drawStyles.stickerMovePad}>
                                        <View style={drawStyles.stickerMoveRow}>
                                            <View style={drawStyles.stickerMoveSpacer} />
                                            <TouchableOpacity
                                                onPress={() => nudgeDraftSticker(0, -0.03)}
                                                style={drawStyles.moveButton}
                                                disabled={!draftSticker}
                                            >
                                                <Text style={drawStyles.moveButtonText}>↑</Text>
                                            </TouchableOpacity>
                                            <View style={drawStyles.stickerMoveSpacer} />
                                        </View>
                                        <View style={drawStyles.stickerMoveRow}>
                                            <TouchableOpacity
                                                onPress={() => nudgeDraftSticker(-0.03, 0)}
                                                style={drawStyles.moveButton}
                                                disabled={!draftSticker}
                                            >
                                                <Text style={drawStyles.moveButtonText}>←</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => nudgeDraftSticker(0, 0.03)}
                                                style={drawStyles.moveButton}
                                                disabled={!draftSticker}
                                            >
                                                <Text style={drawStyles.moveButtonText}>↓</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => nudgeDraftSticker(0.03, 0)}
                                                style={drawStyles.moveButton}
                                                disabled={!draftSticker}
                                            >
                                                <Text style={drawStyles.moveButtonText}>→</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={drawStyles.stickerHint}>
                                        Poti trage sticker-ul direct pe ecran sau il poti ajusta fin din sageti.
                                    </Text>
                                </>
                            )}

                            <View style={drawStyles.submitRow}>
                                <TouchableOpacity onPress={submitChanges} style={drawStyles.primaryAction} disabled={isSaving}>
                                    <Text style={drawStyles.primaryActionText}>{isSaving ? 'Se salveaza...' : 'Submit in AR'}</Text>
                                </TouchableOpacity>
                                <View style={drawStyles.syncBox}>
                                    <Text style={drawStyles.syncTitle}>{getServerUrl() ? 'Server sync activ' : 'Doar salvare locala'}</Text>
                                    <Text style={drawStyles.syncBody}>
                                        {getServerUrl()
                                            ? `Ultimul refresh: ${lastSync ? new Date(lastSync).toLocaleTimeString() : 'acum'}`
                                            : 'Seteaza EXPO_PUBLIC_OVERRIDE_SERVER_URL pentru sincronizare intre dispozitive.'}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </View>
        </SafeAreaView>
    );
}

const drawStyles = StyleSheet.create({
    bottomSheet: {
        backgroundColor: 'rgba(2, 6, 23, 0.9)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: 'auto',
        maxHeight: '44%',
        overflow: 'hidden',
    },
    bottomSheetContent: {
        alignItems: 'center',
        gap: 16,
        padding: 16,
        paddingBottom: 32,
    },
    brushChip: {
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 20,
        borderWidth: 1,
        height: 62,
        justifyContent: 'center',
        width: 62,
    },
    brushChipActive: {
        borderColor: '#38bdf8',
    },
    brushRow: {
        flexDirection: 'row',
        gap: 12,
    },
    canvasStage: {
        ...StyleSheet.absoluteFillObject,
    },
    canvasCard: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    colorSwatch: {
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 999,
        borderWidth: 2,
        height: 40,
        width: 40,
    },
    colorSwatchActive: {
        borderColor: '#f8fafc',
        transform: [{ scale: 1.08 }],
    },
    floatingButton: {
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    floatingButtonText: {
        color: '#f8fafc',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    invalidScreen: {
        alignItems: 'center',
        backgroundColor: '#020617',
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    invalidTitle: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
    },
    loadingText: {
        color: '#cbd5e1',
        fontSize: 16,
        marginTop: 12,
    },
    loadingWrapper: {
        alignItems: 'center',
        backgroundColor: '#020617',
        flex: 1,
        justifyContent: 'center',
    },
    modeChip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    modeChipActive: {
        backgroundColor: '#082f49',
        borderColor: '#38bdf8',
    },
    modeChipText: {
        color: '#cbd5e1',
        fontSize: 13,
        fontWeight: '700',
    },
    modeChipTextActive: {
        color: '#e0f2fe',
    },
    paletteRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    posterPreviewImage: {
        height: '100%',
        opacity: 0.68,
        width: '100%',
    },
    primaryAction: {
        backgroundColor: '#2563eb',
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    primaryActionText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    scaleButton: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    scaleButtonText: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '700',
    },
    scaleValue: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '700',
        minWidth: 110,
        textAlign: 'center',
    },
    moveButton: {
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderRadius: 16,
        borderWidth: 1,
        height: 46,
        justifyContent: 'center',
        minWidth: 62,
        paddingHorizontal: 8,
    },
    moveButtonText: {
        color: '#e2e8f0',
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 28,
    },
    sceneShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2, 6, 23, 0.08)',
    },
    sceneWrapper: {
        backgroundColor: '#000',
        flex: 1,
    },
    screen: {
        backgroundColor: '#020617',
        flex: 1,
    },
    sectionLabel: {
        alignSelf: 'flex-start',
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    statusBox: {
        backgroundColor: 'rgba(8, 47, 73, 0.88)',
        borderColor: 'rgba(125, 211, 252, 0.32)',
        borderRadius: 18,
        borderWidth: 1,
        flex: 1,
        marginLeft: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    statusHeadline: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    statusSubline: {
        color: '#bae6fd',
        fontSize: 12,
        lineHeight: 18,
    },
    stickerHint: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
    },
    stickerMovePad: {
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    stickerMoveRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    stickerMoveSpacer: {
        minWidth: 62,
    },
    stickerPreview: {
        position: 'absolute',
    },
    stickerScaleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
        width: '100%',
    },
    submitRow: {
        gap: 12,
        width: '100%',
    },
    syncBody: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 18,
    },
    syncBox: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
    },
    syncTitle: {
        color: '#f8fafc',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    toolbarRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        width: '100%',
    },
    topControls: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 6,
    },
});
