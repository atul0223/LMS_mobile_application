import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import StudentSVG from "../../../assets/images/student.svg";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { uploadProfilePicture } from "../../services/api";

export default function ProfileScreen() {
  const { user, logout, role, setUserProfile } = useAuth();
  const { showToast } = useToast();

  const [uploadingPic, setUploadingPic] = useState(false);

  const handlePickAndUploadPic = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: false,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setUploadingPic(true);

        const uploadRes = await uploadProfilePicture(
          file.uri,
          file.name || "profile.jpg",
          file.mimeType || "image/jpeg"
        );

        if (uploadRes?.user) {
          setUserProfile(uploadRes.user);
        }
        showToast(uploadRes.message || "Profile picture updated! 📸", "success");
      }
    } catch (err: any) {
      console.error("Profile picture upload error:", err);
      showToast(err.message || "Failed to update profile picture", "error");
    } finally {
      setUploadingPic(false);
    }
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
        {/* Top Header with Title and Settings Button */}
        <View style={styles.pageHeaderRow}>
          <Text style={styles.pageTitle}>My Profile</Text>
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => router.push("/profileupdation")}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarOuterWrapper}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickAndUploadPic}
              disabled={uploadingPic}
              activeOpacity={0.8}
            >
              {user?.profilePic ? (
                <Image source={{ uri: user.profilePic }} style={styles.avatarImg} />
              ) : (
                <StudentSVG width="100%" height="100%" />
              )}
              {uploadingPic ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handlePickAndUploadPic}
              disabled={uploadingPic}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
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

          {/* Edit Profile & Settings */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/profileupdation")}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="person-circle-outline" size={22} color="#FF8383" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuLabel}>Edit Profile & Settings</Text>
              <Text style={styles.menuSub}>Update your name, username and photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

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
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
  },
  settingsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
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
  avatarOuterWrapper: {
    position: "relative",
    marginRight: 14,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f5ecec",
    borderWidth: 1.5,
    borderColor: "#555",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
});
