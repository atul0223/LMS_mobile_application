import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SessionProvider from "@/lib/SessionProvider";
import { useSession } from "@/lib/session";
import { LoadingState } from "@/components";
import theme from "@/theme";

/**
 * Declares every route, then uses guards to decide which are reachable.
 *
 * Routes are always defined — `Stack.Protected` redirects away from screens the
 * current session may not see, which is the SDK 57 pattern. Guards are derived
 * from the session rather than from navigation side effects, so a deep link
 * into a protected screen resolves correctly on cold start.
 */
function RootNavigator() {
    const { token, user, isLoading } = useSession();

    // Hold the UI until the persisted token has been read, otherwise the first
    // frame renders the login screen and then snaps to the app.
    if (isLoading) {
        return <LoadingState />;
    }

    const signedIn = !!token && !!user;
    const isTeacher = signedIn && user.role === "teacher";
    const isStudent = signedIn && user.role === "student";

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.textPrimary,
                headerTitleStyle: {
                    fontSize: theme.type.heading.fontSize,
                    fontWeight: theme.type.heading.fontWeight,
                },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.colors.background },
            }}
        >
            <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={isStudent}>
                <Stack.Screen name="(student)" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={isTeacher}>
                <Stack.Screen name="(teacher)" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <SessionProvider>
                    <StatusBar style="dark" />
                    <RootNavigator />
                </SessionProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
