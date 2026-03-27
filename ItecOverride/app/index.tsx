import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
    return (
        <SafeAreaView className="flex-1">
            <View className="flex-1 items-center justify-center bg-white">
                <Text className="text-xl font-bold text-blue-500">
                    Welcome to Nativewind!
                </Text>
            </View>
        </SafeAreaView>
    );
}