import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';

// Definim tipurile pentru punctele desenate
type Point = { x: number; y: number };
type Line = { points: Point[]; color: string };

const { width, height } = Dimensions.get('window');

export default function App() {
    const [permission, requestPermission] = useCameraPermissions();
    const [lines, setLines] = useState<Line[]>([]);
    const [currentLine, setCurrentLine] = useState<Point[]>([]);
    const strokeColor = "#39ff14"; // Un verde neon, stil cyberpunk

    // 1. Verificăm permisiunile pentru cameră
    if (!permission) {
        return <View style={styles.container}><Text>Se încarcă permisiunile...</Text></View>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                    iTEC: OVERRIDE are nevoie de cameră pentru a funcționa.
                </Text>
                <Button onPress={requestPermission} title="Permite accesul la cameră" />
            </View>
        );
    }

    // 2. Funcții pentru a capta desenul cu degetul
    const handleTouchStart = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentLine([{ x: locationX, y: locationY }]);
    };

    const handleTouchMove = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentLine((prev) => [...prev, { x: locationX, y: locationY }]);
    };

    const handleTouchEnd = () => {
        if (currentLine.length > 0) {
            setLines((prev) => [...prev, { points: currentLine, color: strokeColor }]);
            setCurrentLine([]); // Resetăm linia curentă
        }
    };

    // 3. Transformăm array-ul de puncte într-un format înțeles de SVG
    const createSvgPath = (points: Point[]) => {
        if (points.length === 0) return '';
        const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
        return path.join(' ');
    };

    return (
        <View style={styles.container}>
            {/* Stratul 1: Camera care vede lumea reală */}
            <CameraView style={StyleSheet.absoluteFill} facing="back" />

            {/* Stratul 2: Canvas-ul invizibil pe care desenăm */}
            <View
                style={StyleSheet.absoluteFill}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Svg width={width} height={height}>
                    {/* Desenăm liniile deja finalizate */}
                    {lines.map((line, index) => (
                        <Path
                            key={index}
                            d={createSvgPath(line.points)}
                            stroke={line.color}
                            strokeWidth={8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}

                    {/* Desenăm linia care este în curs de creare (live) */}
                    {currentLine.length > 0 && (
                        <Path
                            d={createSvgPath(currentLine)}
                            stroke={strokeColor}
                            strokeWidth={8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    )}
                </Svg>
            </View>

            {/* Un mic UI pentru debugging / curățare ecran */}
            <View style={styles.uiContainer}>
                <Text style={styles.title}>OVERRIDE MODE: ON</Text>
                <Button title="Șterge Graffiti" onPress={() => setLines([])} color="#ff003c" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    uiContainer: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 15,
        borderRadius: 10,
    },
    title: {
        color: '#39ff14',
        fontWeight: 'bold',
        fontSize: 16,
    },
});