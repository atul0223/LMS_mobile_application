import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import StudentSVG from "../../../assets/images/student.svg";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import {
  getCourseById,
  getCourseVideos,
  purchaseCourse,
  searchCourses,
} from "../../services/api";
import { Course, Video } from "../../types/api";

export default function DetailsPage() {
  const params = useLocalSearchParams<{ courseId?: string; courseData?: string }>();
  const courseId = params.courseId;
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [course, setCourse] = useState<Course | null>(() => {
    if (params.courseData) {
      try {
        return JSON.parse(params.courseData);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState<boolean>(false);

  const fetchCourseAndVideos = async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (!course) {
        try {
          const res = await getCourseById(courseId);
          if (res?.course) {
            setCourse(res.course);
            setIsEnrolled(!!res.course.isEnrolled);
          }
        } catch {
          const searchRes = await searchCourses({ limit: 50 }).catch(() => null);
          const found = searchRes?.courses?.find((c) => c._id === courseId);
          if (found) {
            setCourse(found);
            setIsEnrolled(!!found.isEnrolled);
          }
        }
      } else {
        const isOwner =
          user &&
          ((typeof course.owner === "string" && course.owner === user._id) ||
            (typeof course.owner === "object" &&
              course.owner !== null &&
              course.owner._id === user._id));
        const enrolled =
          isOwner ||
          course.isEnrolled ||
          (user?.enrolledCources || []).some((id) => id.toString() === courseId);
        setIsEnrolled(!!enrolled);
      }

      try {
        const videosRes = await getCourseVideos(courseId);
        setVideos(videosRes.videos || []);
        setIsEnrolled(true);
      } catch (vidErr: any) {
        if (vidErr.status !== 403) {
          console.warn("Could not fetch videos", vidErr.message);
        }
      }
    } catch (err: any) {
      console.error("Error loading course details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseAndVideos();
  }, [courseId]);

  const confirmPurchase = async () => {
    if (!courseId) return;

    try {
      setPurchasing(true);
      const res = await purchaseCourse(courseId);
      showToast(res.message || "Enrolled successfully! Enjoy the course 🚀", "success");
      setIsEnrolled(true);
      setPurchaseModalVisible(false);
      await refreshUser();
      const videosRes = await getCourseVideos(courseId);
      setVideos(videosRes.videos || []);
    } catch (err: any) {
      showToast(err.message || "Failed to complete enrollment", "error");
    } finally {
      setPurchasing(false);
    }
  };

  const isOwner =
    course &&
    user &&
    ((typeof course.owner === "string" && course.owner === user._id) ||
      (typeof course.owner === "object" &&
        course.owner !== null &&
        course.owner._id === user._id));

  const owner =
    course && typeof course.owner === "object" && course.owner !== null
      ? course.owner
      : null;

  const price = course?.price ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {course?.name || "Course Details"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF8383" />
            <Text style={styles.loadingText}>Loading course syllabus...</Text>
          </View>
        ) : null}

        {course ? (
          <>
            {/* Banner Image */}
            <View style={styles.bannerContainer}>
              <Image
                source={
                  course.backgroundPic
                    ? { uri: course.backgroundPic }
                    : require("../../../assets/images/course.png")
                }
                style={styles.bannerImage}
                resizeMode="cover"
              />
              {isEnrolled ? (
                <View style={styles.enrolledBannerTag}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.enrolledBannerTagText}>Enrolled & Unlocked</Text>
                </View>
              ) : null}
            </View>

            {/* Title & Instructor */}
            <View style={styles.infoCard}>
              <Text style={styles.courseTitle}>{course.name}</Text>

              <View style={styles.instructorRow}>
                <View style={styles.avatarCircle}>
                  {owner?.profilePic ? (
                    <Image source={{ uri: owner.profilePic }} style={styles.avatarImg} />
                  ) : (
                    <StudentSVG width="100%" height="100%" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.instructorName}>
                    {owner?.fullName || owner?.username || "Instructor"}
                  </Text>
                  <Text style={styles.instructorRole}>Course Creator</Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>
                    {price === 0 ? "FREE" : `₹${price.toLocaleString()}`}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{course.enrolledStudentCount ?? 0} Learners</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="videocam-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{videos.length} Lessons</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: "#10B981" }]}>Lifetime</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeading}>About this Course</Text>
              <Text style={styles.descriptionText}>
                {course.courseDescription || "No detailed syllabus description provided."}
              </Text>
            </View>

            {/* Teacher Owner Controls */}
            {isOwner ? (
              <View style={styles.ownerControlsCard}>
                <View style={styles.ownerNoticeRow}>
                  <Ionicons name="sparkles" size={18} color="#0284c7" style={{ marginRight: 6 }} />
                  <Text style={styles.ownerNoticeText}>You are the instructor of this course</Text>
                </View>
                <TouchableOpacity
                  style={styles.ownerUploadBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/teacher/uploadVideo",
                      params: { courseId: course._id },
                    })
                  }
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.ownerUploadBtnText}>+ Upload New Lesson</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Curriculum Lessons Section */}
            <View style={styles.curriculumCard}>
              <View style={styles.curriculumHeader}>
                <Text style={styles.curriculumTitle}>Curriculum Lessons</Text>
                <Text style={styles.lessonCountBadge}>{videos.length} videos</Text>
              </View>

              {videos.length === 0 ? (
                <View style={styles.emptyLessonsBox}>
                  <Ionicons name="film-outline" size={36} color="#ccc" />
                  <Text style={styles.emptyLessonsText}>
                    {isEnrolled || isOwner
                      ? "Lessons are currently being prepared for this course."
                      : "Enroll to view and stream all video lessons."}
                  </Text>
                </View>
              ) : (
                videos.map((vid, index) => (
                  <TouchableOpacity
                    key={vid._id}
                    activeOpacity={0.8}
                    style={styles.lessonItem}
                    onPress={() => {
                      router.push({
                        pathname: "/videoplayer",
                        params: {
                          videoId: vid._id,
                          courseId: course._id,
                          videoTitle: vid.title,
                          videoDesc: vid.description || "",
                          videoUrl: vid.url || "",
                        },
                      });
                    }}
                  >
                    <View style={styles.lessonIndexCircle}>
                      <Text style={styles.lessonIndexText}>
                        {vid.metadata?.orderInCourse ?? index + 1}
                      </Text>
                    </View>

                    <View style={styles.lessonDetails}>
                      <Text style={styles.lessonTitle} numberOfLines={1}>
                        {vid.title}
                      </Text>
                      <View style={styles.lessonMeta}>
                        {vid.metadata?.videolength ? (
                          <Text style={styles.lessonMetaText}>⏱ {vid.metadata.videolength}</Text>
                        ) : null}
                        {vid.metadata?.size ? (
                          <Text style={styles.lessonMetaText}>📁 {vid.metadata.size}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.playIconCircle}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom Bar for Unenrolled Students */}
      {course && !isEnrolled && !isOwner && user?.role === "student" ? (
        <View style={styles.bottomBar}>
          <View style={styles.bottomPriceCol}>
            <Text style={styles.bottomPriceLabel}>Total Tuition</Text>
            <Text style={styles.bottomPriceVal}>
              {price === 0 ? "FREE" : `₹${price.toLocaleString()}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bottomEnrollBtn}
            onPress={() => setPurchaseModalVisible(true)}
          >
            <Text style={styles.bottomEnrollBtnText}>Enroll Now</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Purchase Confirmation Modal */}
      <Modal
        visible={purchaseModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPurchaseModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="school" size={32} color="#FF8383" />
            </View>
            <Text style={styles.modalHeading}>Confirm Enrollment</Text>
            <Text style={styles.modalCourseName} numberOfLines={2}>
              {course?.name}
            </Text>

            <View style={styles.modalDetailRow}>
              <Text style={styles.modalDetailLabel}>Tuition Fee</Text>
              <Text style={styles.modalDetailVal}>
                {price === 0 ? "FREE" : `₹${price.toLocaleString()}`}
              </Text>
            </View>
            <View style={styles.modalDetailRow}>
              <Text style={styles.modalDetailLabel}>Access</Text>
              <Text style={styles.modalDetailVal}>Lifetime Instant Access</Text>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPurchaseModalVisible(false)}
                disabled={purchasing}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, purchasing && { opacity: 0.6 }]}
                onPress={confirmPurchase}
                disabled={purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm & Start</Text>
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
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 6,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    maxWidth: "70%",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bannerContainer: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  enrolledBannerTag: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  enrolledBannerTagText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  infoCard: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    lineHeight: 28,
  },
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5ecec",
    borderWidth: 1.5,
    borderColor: "#555",
    overflow: "hidden",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  instructorName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  instructorRole: {
    fontSize: 12,
    color: "#777",
  },
  pricePill: {
    backgroundColor: "#fff5f5",
    borderWidth: 1.5,
    borderColor: "#FF8383",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pricePillText: {
    color: "#FF8383",
    fontWeight: "bold",
    fontSize: 15,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
  },
  ownerControlsCard: {
    marginTop: 14,
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  ownerNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ownerNoticeText: {
    color: "#0369a1",
    fontWeight: "bold",
    fontSize: 13,
  },
  ownerUploadBtn: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  ownerUploadBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  curriculumCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
  },
  curriculumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  curriculumTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  lessonCountBadge: {
    fontSize: 13,
    color: "#777",
  },
  emptyLessonsBox: {
    alignItems: "center",
    padding: 24,
  },
  emptyLessonsText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  lessonIndexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  lessonIndexText: {
    color: "#FF8383",
    fontWeight: "bold",
    fontSize: 13,
  },
  lessonDetails: {
    flex: 1,
    marginRight: 8,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  lessonMeta: {
    flexDirection: "row",
    gap: 10,
    marginTop: 3,
  },
  lessonMetaText: {
    fontSize: 12,
    color: "#888",
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomPriceCol: {},
  bottomPriceLabel: {
    fontSize: 11,
    color: "#777",
    textTransform: "uppercase",
  },
  bottomPriceVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  bottomEnrollBtn: {
    backgroundColor: "#FF8383",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  bottomEnrollBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#777",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#555",
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff5f5",
    borderWidth: 2,
    borderColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  modalCourseName: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalDetailLabel: {
    fontSize: 14,
    color: "#777",
  },
  modalDetailVal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#222",
  },
  modalActionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#555",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#555",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#FF8383",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
