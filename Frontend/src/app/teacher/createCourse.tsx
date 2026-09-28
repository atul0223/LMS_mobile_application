import React, { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "../../components/Toast";
import { createCourse } from "../../services/api";

export default function CreateCourseScreen() {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [backgroundPic, setBackgroundPic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Course title is required");
      showToast("Please enter a course title", "error");
      return;
    }
    if (!description.trim()) {
      setError("Course description is required");
      showToast("Please provide a course description", "error");
      return;
    }

    const numericPrice = price.trim() ? parseFloat(price.trim()) : 0;
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError("Please enter a valid non-negative price");
      showToast("Invalid price entered", "error");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await createCourse({
        courseName: name.trim(),
        courseDescription: description.trim(),
        price: numericPrice,
        backgroundPic: backgroundPic.trim() || undefined,
      });

      showToast("Course created successfully! 🚀", "success");
      router.replace({
        pathname: "/teacher/uploadVideo",
        params: { courseId: res.course._id },
      });
    } catch (err: any) {
      setError(err.message || "Failed to create course. Please try again.");
      showToast(err.message || "Failed to create course", "error");
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.navTitle}>Create New Course</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.heading}>Course Information</Text>
            <Text style={styles.subheading}>
              Set up your curriculum basics. Once created, you can add video lessons immediately.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#d93025" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Course Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Title *</Text>
              <TextInput
                placeholder="e.g. Master Full-Stack Web Development"
                placeholderTextColor="#999"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setError(null);
                }}
                style={styles.textInput}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Syllabus / Description *</Text>
              <TextInput
                placeholder="What key skills and outcomes will students achieve?"
                placeholderTextColor="#999"
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  setError(null);
                }}
                multiline
                numberOfLines={4}
                style={[styles.textInput, styles.textArea]}
              />
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Fee (in ₹, enter 0 for Free)</Text>
              <TextInput
                placeholder="0"
                placeholderTextColor="#999"
                value={price}
                onChangeText={(v) => {
                  setPrice(v);
                  setError(null);
                }}
                keyboardType="numeric"
                style={styles.textInput}
              />
            </View>

            {/* Cover Image URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cover Image Web URL (Optional)</Text>
              <TextInput
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#999"
                value={backgroundPic}
                onChangeText={setBackgroundPic}
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Publish Course →</Text>
              )}
            </TouchableOpacity>
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
    minHeight: 90,
    textAlignVertical: "top",
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
