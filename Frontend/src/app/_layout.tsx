import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ToastProvider } from "../components/Toast";

function RootNavigationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === "(auth)" ||
      segments[0] === "Login" ||
      segments[0] === "Signup";

    if (!isAuthenticated && !inAuthGroup) {
      // Throw unauthenticated user straight to Login page
      router.replace("/(auth)/Login");
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect logged-in user away from auth pages to main tabs
      router.replace("/(tabs)/index");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#FF8383" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style="dark" />
          <RootNavigationGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)/Login" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)/Signup" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="detailspage/index" options={{ headerShown: false }} />
              <Stack.Screen
                name="videoplayer/index"
                options={{
                  headerShown: false,
                  orientation: "all",
                }}
              />
              <Stack.Screen
                name="teacher/createCourse"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="teacher/uploadVideo"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              <Stack.Screen name="homepage/index" options={{ headerShown: false }} />
            </Stack>
          </RootNavigationGuard>
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
