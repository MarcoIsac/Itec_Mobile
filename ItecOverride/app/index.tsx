import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function HomeScreen() {
    const router = useRouter();
    return (
        <SafeAreaView className="flex-1 bg-[#020617]">
            {/* Background with a subtle dark blue tint */}
            <View className="flex-1 px-8 justify-center items-center">

                {/* Logo Section */}
                <View className="items-center mb-16">
                    <Image source={require('../assets/images/itec.png')} className="w-60 h-60" />
                    <Text className="text-blue-100 text-5xl font-black tracking-tighter">
                        OVERRIDE
                    </Text>
                    <View className="h-1 w-20 bg-blue-500 mt-2 rounded-full" />
                </View>

                {/* Info Card */}
                <View className="bg-blue-900/20 p-6 rounded-3xl border border-blue-800/50 mb-12">
                    <Text className="text-blue-200 text-center text-base leading-6">
                        Scan physical posters to unlock the digital canvas.
                        Draw together in real-time.
                    </Text>
                </View>

                {/* Primary Action */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/scanner')}
                    className="bg-blue-600 w-full py-5 rounded-2xl shadow-xl shadow-blue-900 border border-blue-400"
                >
                    <Text className="text-white text-center text-xl font-bold uppercase tracking-widest">
                        Enter Override
                    </Text>
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
}
