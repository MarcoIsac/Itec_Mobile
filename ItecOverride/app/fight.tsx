import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

// Importăm clientul de socket
import { io } from "socket.io-client";

// ==========================================
// CONFIGURARE CRITICĂ: PUNE IP-UL TĂU AICI!
// Nu folosi 'localhost', telefoanele nu îl văd.
// ==========================================
const LAPTOP_IP = "LAPTOP_IP"; // Ex: "192.168.1.15"
const SERVER_URL = `http://${LAPTOP_IP}:3000`;


type Point = { x: number; y: number };
type Line = { points: Point[]; color: string; id: string }; // Adăugăm ID unic

const { width, height } = Dimensions.get('window');

export default function FightScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [lines, setLines] = useState<Line[]>([]);
    const [currentLine, setCurrentLine] = useState<Point[]>([]);
    const [strokeColor, setStrokeColor] = useState("#39ff14"); // Verde neon
    const [connected, setConnected] = useState(false);
    const router = useRouter();

    // Folosim useRef pentru socket ca să nu se re-creeze la fiecare randare
    const socketRef = useRef<any>(null);

    // 1. Efectul pentru gestionarea conexiunii WebSocket
    useEffect(() => {
        console.log(`Încercăm conectarea la server: ${SERVER_URL}`);

        // Creăm conexiunea
        socketRef.current = io(SERVER_URL, {
            transports: ['websocket'], // Forțăm WebSocket pentru viteză
        });

        // Ascultăm evenimentele
        socketRef.current.on('connect', () => {
            console.log('Conectat la serverul iTEC!');
            setConnected(true);
        });

        socketRef.current.on('connect_error', (err: any) => {
            console.log('Eroare conexiune server:', err.message);
            setConnected(false);
        });

        // Când ne conectăm prima dată, primim istoricul
        socketRef.current.on('initHistory', (history: Line[]) => {
            console.log(`Am primit ${history.length} linii de istoric.`);
            setLines(history);
        });

        // Când cineva trimite o linie nouă în timp real
        socketRef.current.on('newLine', (newLine: Line) => {
            console.log('Am primit o linie nouă prin broadcast!');
            setLines((prev) => [...prev, newLine]);
        });

        // Când cineva șterge tot
        socketRef.current.on('clearCanvas', () => {
            setLines([]);
        });

        // Curățarea conexiunii când închidem aplicația
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // 2. Verificăm permisiunile pentru cameră
    if (!permission || !permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{color: 'white', textAlign: 'center', marginBottom: 20}}>Avem nevoie de cameră.</Text>
                <Button onPress={requestPermission} title="Permite camera" />
            </View>
        );
    }

    // 3. Funcții pentru a capta desenul cu degetul
    const handleTouchStart = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentLine([{ x: locationX, y: locationY }]);
    };

    const handleTouchMove = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentLine((prev) => [...prev, { x: locationX, y: locationY }]);
    };

    const handleTouchEnd = () => {
        if (currentLine.length > 1) { // Minim 2 puncte pentru o linie
            const newLine: Line = {
                points: currentLine,
                color: strokeColor,
                id: `${socketRef.current?.id}_${Date.now()}` // ID unic bazat pe socket și timp
            };

            // Adăugăm local
            setLines((prev) => [...prev, newLine]);

            // TRMITEM LINIA LA SERVER ÎN TIMP REAL!
            if (socketRef.current && connected) {
                socketRef.current.emit('sendLine', newLine);
                console.log('Linie trimisă la server.');
            }

            setCurrentLine([]); // Resetăm linia curentă
        }
    };

    // Funcția pentru ștergere sincronizată
    const requestClearAll = () => {
        if (socketRef.current && connected) {
            socketRef.current.emit('requestClear');
        }
    };

    // Transformăm array-ul de puncte într-un format înțeles de SVG
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
                    {/* Desenăm liniile deja finalizate (locale + primite) */}
                    {lines.map((line) => (
                        <Path
                            key={line.id}
                            d={createSvgPath(line.points)}
                            stroke={line.color}
                            strokeWidth={8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}

                    {/* Desenăm linia care este în curs de creare locală (live) */}
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

            {/* UI pentru debugging și culori */}
            <View style={styles.uiContainer}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                    {/* Indicator de conexiune */}
                    <View style={[styles.statusDot, {backgroundColor: connected ? '#39ff14' : 'red'}]} />
                    <Text style={styles.title}>SYNC MODE</Text>
                </View>

                <View style={styles.palette}>
                    {['#39ff14', '#ff003c', '#00f0ff', '#ffffff'].map((color) => (
                        <View
                            key={color}
                            onTouchStart={() => setStrokeColor(color)}
                            style={[
                                styles.colorCircle,
                                { backgroundColor: color, borderWidth: strokeColor === color ? 3 : 0 }
                            ]}
                        />
                    ))}
                </View>
                <Button title="Ieși" onPress={() => router.back()} color="#ff003c" />
                <Button title="Șterge Tot" onPress={requestClearAll} color="#444" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    uiContainer: {
        position: 'absolute',
        bottom: 30,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 15,
        borderRadius: 15,
        gap: 10,
    },
    palette: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginVertical: 5,
    },
    colorCircle: {
        width: 35,
        height: 35,
        borderRadius: 18,
        borderColor: '#fff',
    },
    title: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    }
});