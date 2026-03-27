import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Titlul aplicației */}
            <View style={styles.header}>
                <Text style={styles.title}>iTEC:</Text>
                <Text style={styles.subtitle}>OVERRIDE</Text>
            </View>

            <Text style={styles.description}>
                Orașul este plin de ecrane care nu vă aparțin.{"\n"}
                Revendicați teritoriul. Lăsați-vă amprenta.
            </Text>

            {/* Butonul care te duce în ecranul de Fight */}
            <TouchableOpacity
                style={styles.fightButton}
                onPress={() => router.push('/fight' as any)}
            >
                <Text style={styles.fightButtonText}>FIGHT (Scan & Override)</Text>
            </TouchableOpacity>

            {/* Un placeholder pentru o viitoare hartă sau clasament */}
            <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Vezi Harta Teritoriilor</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a', // Un negru cyberpunk
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 50,
        fontWeight: '900',
        color: '#ff003c', // Roșu agresiv
        letterSpacing: 5,
        textShadowColor: '#ff003c',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    description: {
        color: '#888',
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 60,
        lineHeight: 24,
    },
    fightButton: {
        backgroundColor: '#39ff14', // Verde neon
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 10,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#39ff14',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    fightButtonText: {
        color: '#000',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    secondaryButton: {
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#444',
        width: '100%',
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});