import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CourseCardSkeleton } from "../../components/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import {
  deleteCourse,
  getTeacherCourses,
  updateCourse,
} from "../../services/api";
import { Course } from "../../types/api";

export default function TeacherTabScreen() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Course Modal state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchCourses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await getTeacherCourses();
      setCourses(res.courses || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load teacher courses", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const handleDeleteCourse = (courseId: string, courseName: string) => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to permanently delete "${courseName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCourse(courseId);
              showToast("Course deleted successfully", "success");
              setCourses((prev) => prev.filter((c) => c._id !== courseId));
            } catch (err: any) {
              showToast(err.message || "Failed to delete course", "error");
            }
          },
        },
      ]
    );
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setEditName(course.name);
    setEditDesc(course.courseDescription || "");
    setEditPrice(course.price !== undefined ? String(course.price) : "0");
  };

  const handleSaveEdit = async () => {
    if (!editingCourse) return;
    if (!editName.trim()) {
      showToast("Course title is required", "error");
      return;
    }

    try {
      setUpdating(true);
      const parsedPrice = parseFloat(editPrice) || 0;
      await updateCourse({
        courseId: editingCourse._id,
        newName: editName.trim(),
        newDescription: editDesc.trim(),
        newPrice: parsedPrice,
      });

      showToast("Course updated successfully!", "success");
      setEditingCourse(null);
      fetchCourses();
    } catch (err: any) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setUpdating(false);
    }
  };

  const totalStudents = courses.reduce(
    (acc, curr) => acc + (curr.enrolledStudentCount || 0),
    0
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF8383"]}
            tintColor="#FF8383"
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Teacher Studio 👨‍🏫</Text>
                <Text style={styles.subtitle}>
                  Manage your educational content & track students
                </Text>
              </View>
            </View>

            {/* Metrics Dashboard Banner */}
            <View style={styles.metricsCard}>
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>{courses.length}</Text>
                <Text style={styles.metricLabel}>Courses Created</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>{totalStudents}</Text>
                <Text style={styles.metricLabel}>Total Students</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => router.push("/teacher/createCourse")}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionText}>Create Course</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => router.push("/teacher/uploadVideo")}
              >
                <Ionicons name="videocam-outline" size={18} color="#FF8383" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryActionText}>Upload Lesson</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeading}>Your Published Courses</Text>

            {loading && !refreshing ? (
              <View style={{ marginTop: 8 }}>
                <CourseCardSkeleton />
                <CourseCardSkeleton />
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.courseCard}>
            <View style={styles.imageContainer}>
              <Image
                source={
                  item.backgroundPic
                    ? { uri: item.backgroundPic }
                    : require("../../../assets/images/course.png")
                }
                style={styles.courseImage}
                resizeMode="cover"
              />
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  {item.price === 0 ? "FREE" : `₹${item.price ?? 0}`}
                </Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.courseName}>{item.name}</Text>
              <Text style={styles.courseDesc} numberOfLines={2}>
                {item.courseDescription || "No description provided."}
              </Text>

              <View style={styles.studentsRow}>
                <Ionicons name="people-outline" size={15} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.studentsText}>
                  {item.enrolledStudentCount ?? 0} enrolled students
                </Text>
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.cardActionBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/detailspage",
                      params: { courseId: item._id },
                    })
                  }
                >
                  <Text style={styles.cardActionBtnText}>Syllabus</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addVideoBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/teacher/uploadVideo",
                      params: { courseId: item._id },
                    })
                  }
                >
                  <Text style={styles.addVideoBtnText}>+ Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Ionicons name="create-outline" size={16} color="#0284c7" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteCourse(item._id, item.name)}
                >
                  <Ionicons name="trash-outline" size={16} color="#d93025" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="easel-outline" size={56} color="#FF8383" />
              <Text style={styles.emptyTitle}>No courses created yet</Text>
              <Text style={styles.emptySubtitle}>
                Share your knowledge with learners worldwide by publishing your first course!
              </Text>
              <TouchableOpacity
                style={styles.createNowBtn}
                onPress={() => router.push("/teacher/createCourse")}
              >
                <Text style={styles.createNowBtnText}>+ Create Course Now</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Edit Course Modal */}
      <Modal
        visible={!!editingCourse}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingCourse(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Course</Text>
              <TouchableOpacity onPress={() => setEditingCourse(null)}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Course Title</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Course title"
            />

            <Text style={styles.modalLabel}>Course Description</Text>
            <TextInput
              style={[styles.modalTextInput, styles.modalTextArea]}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              numberOfLines={3}
              placeholder="Description"
            />

            <Text style={styles.modalLabel}>Price (₹)</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
              placeholder="0 for Free"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingCourse(null)}
                disabled={updating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, updating && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  metricsCard: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
    alignItems: "center",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1.5,
    height: 40,
    backgroundColor: "#eee",
  },
  metricNumber: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FF8383",
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: "#FF8383",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryActionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FF8383",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryActionText: {
    color: "#FF8383",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  courseCard: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  imageContainer: {
    width: "100%",
    height: 150,
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  courseImage: {
    width: "100%",
    height: "100%",
  },
  priceBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  cardContent: {
    padding: 14,
  },
  courseName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
  },
  courseDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
  studentsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  studentsText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },
  cardActionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#555",
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  addVideoBtn: {
    backgroundColor: "#FF8383",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addVideoBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  editBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  deleteBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d93025",
    backgroundColor: "#ffe5e5",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  createNowBtn: {
    marginTop: 20,
    backgroundColor: "#FF8383",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  createNowBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
    marginBottom: 4,
  },
  modalTextInput: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: "top",
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
