import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../components/Toast";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style="dark" />
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
            <Stack.Screen name="profileupdation" options={{ headerShown: false }} />
            <Stack.Screen name="homepage/index" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
