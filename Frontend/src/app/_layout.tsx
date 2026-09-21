import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import HomeScreen from ".";
import Login from "./(auth)/Login";
import Signup from "./(auth)/Signup";
export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Signup/>
    </ThemeProvider>
  );
}
