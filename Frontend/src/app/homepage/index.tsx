import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function HomepageRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/Login" />;
  }

  return <Redirect href="/(tabs)/index" />;
}
