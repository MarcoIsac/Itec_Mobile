import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* Index este automat prima pagină */}
            <Stack.Screen name="index" />
            {/* Fight este pagina a doua */}
            <Stack.Screen name="fight" />
        </Stack>
    );
}