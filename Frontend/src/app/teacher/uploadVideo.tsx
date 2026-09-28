import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import { getTeacherCourses, uploadTeacherVideo } from "../../services/api";
import { useToast } from "../../components/Toast";
import { Course } from "../../types/api";

export default function UploadVideoScreen() {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { showToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    params.courseId || ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderInCourse, setOrderInCourse] = useState("1");
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await getTeacherCourses();
        setCourses(res.courses || []);
        if (!selectedCourseId && res.courses?.length > 0) {
          setSelectedCourseId(res.courses[0]._id);
        }
      } catch (err: any) {
        console.error("Failed to load teacher courses", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const handlePickVideo = async () => {
    try {
      setError(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: ["video/*"],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelectedFile(file);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to select video", "error");
    }
  };

  const handleUpload = async () => {
    if (!selectedCourseId) {
      setError("Please select a target course");
      showToast("Please choose a course", "error");
      return;
    }
    if (!title.trim()) {
      setError("Video title is required");
      showToast("Please enter a lesson title", "error");
      return;
    }
    if (!selectedFile) {
      setError("Please select a video file");
      showToast("Please choose a video file to upload", "error");
      return;
    }

    if (selectedFile.size && selectedFile.size > 200 * 1024 * 1024) {
      setError("Video file exceeds the maximum 200MB limit. Please compress or select a smaller file.");
      showToast("File exceeds 200MB limit", "error");
      return;
    }

    const parsedOrder = parseInt(orderInCourse, 10);
    if (isNaN(parsedOrder) || parsedOrder < 1) {
      setError("Order in course must be a positive number");
      showToast("Order must be a number", "error");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const res = await uploadTeacherVideo({
        title: title.trim(),
        description: description.trim(),
        courseId: selectedCourseId,
        orderInCourse: parsedOrder,
        fileUri: selectedFile.uri,
        fileName: selectedFile.name || "lesson.mp4",
        mimeType: selectedFile.mimeType || "video/mp4",
        file: (selectedFile as any).file,
      });

      showToast(res.message || "Video processed & uploaded successfully! 🎬", "success");
      router.replace({
        pathname: "/detailspage",
        params: { courseId: selectedCourseId },
      });
    } catch (err: any) {
      console.error("Video upload error:", err);
      const msg = err.message || "Video upload failed. Check file format.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const dropdownData = courses.map((c) => ({
    label: c.name,
    value: c._id,
  }));

  const fileSizeMb = selectedFile?.size
    ? (selectedFile.size / (1024 * 1024)).toFixed(2)
    : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={22} color="#555" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Upload Lesson Video</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.heading}>Lesson Media & Info</Text>
            <Text style={styles.subheading}>
              Upload MP4/MOV videos for your course curriculum. Cloudinary automatically configures adaptive HLS streaming.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#d93025" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Course Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Course *</Text>
              {loadingCourses ? (
                <ActivityIndicator size="small" color="#FF8383" />
              ) : courses.length === 0 ? (
                <Text style={styles.noCoursesText}>
                  No courses created. Please create a course first.
                </Text>
              ) : (
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.dropdownPlaceholder}
                  selectedTextStyle={styles.dropdownSelected}
                  data={dropdownData}
                  labelField="label"
                  valueField="value"
                  placeholder="Select a course"
                  value={selectedCourseId}
                  onChange={(item) => setSelectedCourseId(item.value)}
                />
              )}
            </View>

            {/* Video Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lesson Title *</Text>
              <TextInput
                placeholder="e.g. 01. Getting Started with the Project"
                placeholderTextColor="#999"
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setError(null);
                }}
                style={styles.textInput}
              />
            </View>

            {/* Order in Course */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Order in Course (e.g. 1, 2, 3...) *</Text>
              <TextInput
                placeholder="1"
                placeholderTextColor="#999"
                value={orderInCourse}
                onChangeText={(v) => {
                  setOrderInCourse(v);
                  setError(null);
                }}
                keyboardType="numeric"
                style={styles.textInput}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lesson Summary / Notes</Text>
              <TextInput
                placeholder="Brief summary of concepts covered in this video..."
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.textArea]}
              />
            </View>

            {/* Video File Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Video File *</Text>
              <TouchableOpacity
                style={styles.pickFileBtn}
                onPress={handlePickVideo}
              >
                <Ionicons
                  name={selectedFile ? "checkmark-circle-outline" : "cloud-upload-outline"}
                  size={20}
                  color="#FF8383"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.pickFileBtnText}>
                  {selectedFile ? "Change Video File" : "Choose Video File (.mp4, .mov)"}
                </Text>
              </TouchableOpacity>

              {selectedFile ? (
                <View style={styles.filePreviewCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileNameText} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    {fileSizeMb ? (
                      <Text style={styles.fileSizeText}>Size: {fileSizeMb} MB</Text>
                    ) : null}
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              ) : null}
            </View>

            {/* Upload Button */}
            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Processing & Deploying Video...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Deploy Lesson Video</Text>
              )}
            </TouchableOpacity>

            {uploading ? (
              <Text style={styles.progressNote}>
                Encoding video with Cloudinary adaptive HLS pipeline. This may take a moment.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    borderBottomColor: "#f0f0f0",
  },
  cancelBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 14,
    padding: 20,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  subheading: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  dropdown: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  dropdownSelected: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  noCoursesText: {
    fontSize: 13,
    color: "#d93025",
  },
  pickFileBtn: {
    backgroundColor: "#fff5f5",
    borderWidth: 1.5,
    borderColor: "#FF8383",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pickFileBtnText: {
    color: "#FF8383",
    fontWeight: "bold",
    fontSize: 14,
  },
  filePreviewCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  fileSizeText: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: "#FF8383",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressNote: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: "#ffe5e5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF8383",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "#d93025",
    fontSize: 13,
    flex: 1,
  },
});
