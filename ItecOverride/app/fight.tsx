import React, { useState, useEffect, useRef } from 'react';
import {StyleSheet, Text, View, Button, Dimensions, TouchableOpacity} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';
// Importăm uneltele de rute pentru a prinde codul și a ne întoarce
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io } from "socket.io-client";

// ==========================================
// PUNE IP-UL TĂU AICI (ca și până acum)
// ==========================================
const LAPTOP_IP = "ADRESA_TA_DE_IP_AICI";
const SERVER_URL = `http://${LAPTOP_IP}:3000`;

type Point = { x: number; y: number };
type Line = { points: Point[]; color: string; id: string };

const { width, height } = Dimensions.get('window');

export default function FightScreen() {
    const router = useRouter();
    // Prindem parametrul 'room' trimis de pe ecranul Home
    const { room } = useLocalSearchParams();

    const [permission, requestPermission] = useCameraPermissions();
    const [lines, setLines] = useState<Line[]>([]);
    const [currentLine, setCurrentLine] = useState<Point[]>([]);
    const [strokeColor, setStrokeColor] = useState("#39ff14");
    const [connected, setConnected] = useState(false);

    const socketRef = useRef<any>(null);

    useEffect(() => {
        // Ne asigurăm că avem un cod de cameră înainte să ne conectăm
        if (!room) return;

        console.log(`Ne conectăm la server pentru afișul: ${room}`);

        socketRef.current = io(SERVER_URL, {
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            console.log('Conectat! Cerem acces în camera:', room);
            setConnected(true);

            // 1. Spunem serverului în ce cameră/afiș vrem să intrăm
            socketRef.current.emit('joinRoom', room);
        });

        // 2. Primim istoricul DOAR pentru acest afiș
        socketRef.current.on('initHistory', (history: Line[]) => {
            setLines(history || []); // history poate fi undefined dacă e cameră nouă
        });

        // 3. Primim o linie nouă (doar de la cei din aceeași cameră)
        socketRef.current.on('newLine', (newLine: Line) => {
            setLines((prev) => [...prev, newLine]);
        });

        // 4. Ștergerea canvasului (doar pentru acest afiș)
        socketRef.current.on('clearCanvas', () => {
            setLines([]);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [room]); // Re-rulăm efectul dacă se schimbă camera

    if (!permission || !permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{color: 'white', textAlign: 'center', marginBottom: 20}}>Avem nevoie de cameră.</Text>
                <Button onPress={requestPermission} title="Permite camera" />
            </View>
        );
    }

    const handleTouchStart = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentLine([{ x: locationX, y: locationY }]);
    };

    const handleTouchMove = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentLine((prev) => [...prev, { x: locationX, y: locationY }]);
    };

    const handleTouchEnd = () => {
        if (currentLine.length > 1) {
            const newLine: Line = {
                points: currentLine,
                color: strokeColor,
                id: `${socketRef.current?.id}_${Date.now()}`
            };

            setLines((prev) => [...prev, newLine]);

            // Modificare AICI: Trimitem linia ȘI codul camerei
            if (socketRef.current && connected) {
                socketRef.current.emit('sendLine', { line: newLine, roomId: room });
            }

            setCurrentLine([]);
        }
    };

    const requestClearAll = () => {
        // Modificare AICI: Spunem serverului ce cameră să șteargă
        if (socketRef.current && connected) {
            socketRef.current.emit('requestClear', room);
        }
    };

    const createSvgPath = (points: Point[]) => {
        if (points.length === 0) return '';
        return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    return (
        <View style={styles.container}>
            <CameraView style={StyleSheet.absoluteFill} facing="back" />

            <View
                style={StyleSheet.absoluteFill}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Svg width={width} height={height}>
                    {lines.map((line) => (
                        <Path key={line.id} d={createSvgPath(line.points)} stroke={line.color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    ))}
                    {currentLine.length > 0 && (
                        <Path d={createSvgPath(currentLine)} stroke={strokeColor} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    )}
                </Svg>
            </View>

            {/* Bara de Sus: Arătăm codul Afișului */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>◀ RETRAGERE</Text>
                </TouchableOpacity>
                <View style={styles.roomBadge}>
                    <Text style={styles.roomBadgeText}>AFIȘ: {room}</Text>
                </View>
            </View>

            {/* Bara de Jos: UI pentru culori */}
            <View style={styles.uiContainer}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                    <View style={[styles.statusDot, {backgroundColor: connected ? '#39ff14' : 'red'}]} />
                    <Text style={styles.title}>SYNC</Text>
                </View>

                <View style={styles.palette}>
                    {['#39ff14', '#ff003c', '#00f0ff', '#ffffff'].map((color) => (
                        <View
                            key={color}
                            onTouchStart={() => setStrokeColor(color)}
                            style={[styles.colorCircle, { backgroundColor: color, borderWidth: strokeColor === color ? 3 : 0 }]}
                        />
                    ))}
                </View>

                <TouchableOpacity onPress={requestClearAll} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>BOMB</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Stiluri pentru bara de sus
    topBar: {
        position: 'absolute',
        top: 50, // Lăsăm loc pentru notch-ul telefoanelor
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ff003c' },
    backBtnText: { color: '#ff003c', fontWeight: 'bold' },
    roomBadge: { backgroundColor: 'rgba(57, 255, 20, 0.2)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#39ff14' },
    roomBadgeText: { color: '#39ff14', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },

    // Stiluri pentru bara de jos
    uiContainer: { position: 'absolute', bottom: 30, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 15 },
    palette: { flexDirection: 'row', gap: 10 },
    colorCircle: { width: 35, height: 35, borderRadius: 18, borderColor: '#fff' },
    title: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    clearBtn: { backgroundColor: '#ff003c', padding: 10, borderRadius: 8 },
    clearBtnText: { color: 'white', fontWeight: 'bold' }
});