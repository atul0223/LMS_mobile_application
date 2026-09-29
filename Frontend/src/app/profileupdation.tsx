import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import * as DocumentPicker from "expo-document-picker";
import StudentSVG from "../../assets/images/student.svg";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { updateUserProfile, uploadProfilePicture } from "../services/api";

export default function ProfileUpdationScreen() {
  const { user, setUserProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);
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

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      showToast("Username cannot be empty", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await updateUserProfile({
        fullName: fullName.trim(),
        username: username.trim(),
      });

      if (res?.user) {
        setUserProfile(res.user);
      }
      showToast(res.message || "Profile updated successfully! ✅", "success");
      router.back();
    } catch (err: any) {
      console.error("Profile update error:", err);
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const isTeacher = user?.role === "teacher";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Edit Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuterWrapper}>
              <TouchableOpacity
                style={styles.avatarContainer}
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
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.changePicBtn}
              onPress={handlePickAndUploadPic}
              disabled={uploadingPic}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FF8383" style={{ marginRight: 6 }} />
              <Text style={styles.changePicText}>
                {uploadingPic ? "Uploading..." : "Change Profile Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Personal Information</Text>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#777" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="at-outline" size={18} color="#777" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email (Read Only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
                <Text style={styles.disabledText}>{user?.email}</Text>
                {user?.isVerified ? (
                  <View style={styles.verifiedTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.verifiedTagText}>Verified</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.helperText}>Email is linked to account authentication</Text>
            </View>

            {/* Account Role */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Role</Text>
              <View style={styles.roleBox}>
                <Ionicons
                  name={isTeacher ? "school-outline" : "book-outline"}
                  size={18}
                  color="#FF8383"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.roleText}>
                  {isTeacher ? "Teacher / Instructor Account" : "Student Learner Account"}
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Saving Changes...</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>Save Profile Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarOuterWrapper: {
    position: "relative",
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f5ecec",
    borderWidth: 2,
    borderColor: "#FF8383",
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
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  changePicBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF8383",
  },
  changePicText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF8383",
  },
  card: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 14,
    padding: 18,
    backgroundColor: "#fff",
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: "#fff",
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    height: "100%",
  },
  inputDisabled: {
    backgroundColor: "#f9f9f9",
    borderColor: "#ddd",
  },
  disabledText: {
    flex: 1,
    fontSize: 14,
    color: "#777",
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  helperText: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
    marginLeft: 2,
  },
  roleBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF8383",
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF8383",
  },
  saveBtn: {
    backgroundColor: "#FF8383",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
