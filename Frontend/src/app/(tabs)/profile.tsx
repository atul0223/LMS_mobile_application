import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import StudentSVG from "../../../assets/images/student.svg";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getBaseUrl, setCustomBaseUrl } from "../../services/api";

export default function ProfileScreen() {
  const { user, logout, role } = useAuth();
  const { showToast } = useToast();

  const [apiUrlModalVisible, setApiUrlModalVisible] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState("");
  const [newApiUrl, setNewApiUrl] = useState("");

  const handleOpenApiModal = async () => {
    const url = await getBaseUrl();
    setCurrentApiUrl(url);
    setNewApiUrl(url);
    setApiUrlModalVisible(true);
  };

  const handleSaveApiUrl = async () => {
    if (!newApiUrl.trim().startsWith("http")) {
      showToast("API URL must begin with http:// or https://", "error");
      return;
    }
    await setCustomBaseUrl(newApiUrl.trim());
    showToast("API Endpoint updated!", "success");
    setApiUrlModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          showToast("Logged out successfully", "info");
          router.replace("/(auth)/Login");
        },
      },
    ]);
  };

  const isTeacher = role === "teacher";
  const enrolledCount = user?.enrolledCources?.length || 0;
  const spentMoney = user?.lifeTimeSpentMoney || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>My Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {user?.profilePic ? (
              <Image source={{ uri: user.profilePic }} style={styles.avatarImg} />
            ) : (
              <StudentSVG width="100%" height="100%" />
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.fullName}>
              {user?.fullName || user?.username || "Learner"}
            </Text>
            <Text style={styles.username}>@{user?.username || "user"}</Text>
            <Text style={styles.emailText}>{user?.email}</Text>

            <View style={styles.badgesRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {isTeacher ? "👨‍🏫 Teacher Account" : "🎓 Student Account"}
                </Text>
              </View>
              {user?.isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-done" size={13} color="#10B981" style={{ marginRight: 2 }} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{enrolledCount}</Text>
            <Text style={styles.statLabel}>Enrolled Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNum}>₹{spentMoney.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Lifetime Spent</Text>
          </View>
        </View>

        {/* Navigation & Preferences List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Options</Text>

          {isTeacher ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/teacher")}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="school-outline" size={20} color="#FF8383" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>Teacher Hub</Text>
                <Text style={styles.menuSub}>Manage courses and uploads</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/learning")}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="book-outline" size={20} color="#FF8383" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>My Learning</Text>
                <Text style={styles.menuSub}>Access your enrolled curriculum</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleOpenApiModal}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="server-outline" size={20} color="#555" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuLabel}>Backend Endpoint Config</Text>
              <Text style={styles.menuSub}>Change local IP or server URL</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                "LMS Platform",
                "Advanced Learning Management System\nFeaturing adaptive HLS video streaming, dual student & teacher roles, and secure OTP verification."
              )
            }
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="information-circle-outline" size={20} color="#555" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuLabel}>About App</Text>
              <Text style={styles.menuSub}>Version 1.0.0 Production</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#d93025" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* API Config Modal */}
      <Modal
        visible={apiUrlModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setApiUrlModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backend API Configuration</Text>
              <TouchableOpacity onPress={() => setApiUrlModalVisible(false)}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Current Base URL: <Text style={{ fontWeight: "bold" }}>{currentApiUrl}</Text>
            </Text>

            <Text style={styles.modalLabel}>New Base URL:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={newApiUrl}
              onChangeText={setNewApiUrl}
              placeholder="https://lms-backend-bc8d.onrender.com"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setApiUrlModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveApiUrl}
              >
                <Text style={styles.modalSaveText}>Save Endpoint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f5ecec",
    borderWidth: 1.5,
    borderColor: "#555",
    overflow: "hidden",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
  },
  fullName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  username: {
    fontSize: 13,
    color: "#777",
    marginTop: 1,
  },
  emailText: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  roleBadge: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF8383",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FF8383",
  },
  verifiedBadge: {
    backgroundColor: "#e6f9ed",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#10B981",
  },
  statsCard: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
    alignItems: "center",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1.5,
    height: 36,
    backgroundColor: "#eee",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF8383",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  sectionCard: {
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextBox: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  menuSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#d93025",
    paddingVertical: 14,
    borderRadius: 10,
  },
  logoutBtnText: {
    color: "#d93025",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
    borderColor: "#555",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalSub: {
    fontSize: 13,
    color: "#666",
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  modalTextInput: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#555",
  },
  modalCancelText: {
    color: "#555",
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#FF8383",
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
