import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import StudentSVG from "../../assets/images/student.svg";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoCircle}>
          <StudentSVG width={64} height={64} />
        </View>
        <Text style={styles.brandTitle}>LMS Platform</Text>
        <Text style={styles.brandSubtitle}>Empowering Modern Learning</Text>
        <ActivityIndicator size="large" color="#FF8383" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/index" />;
  }

  return <Redirect href="/(auth)/Login" />;
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fff5f5",
    borderWidth: 2,
    borderColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
});
