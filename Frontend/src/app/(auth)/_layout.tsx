import { Stack } from "expo-router";
import theme from "@/theme";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.textPrimary,
                headerShadowVisible: false,
                headerBackButtonDisplayMode: "minimal",
                contentStyle: { backgroundColor: theme.colors.background },
            }}
        >
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ title: "Create account" }} />
            <Stack.Screen name="verify-otp" options={{ title: "Verify email" }} />
        </Stack>
    );
}
