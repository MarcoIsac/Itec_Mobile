import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "./globals.css";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    gestureEnabled: false,
                    animation: "fade",
                }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="scanner" />
                <Stack.Screen name="drawScreen" />
            </Stack>
        </SafeAreaProvider>
    )
}

