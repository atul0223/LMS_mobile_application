import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Card from "../../components/Card";
import { CourseCardSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { getCourseFeed } from "../../services/api";
import { Course } from "../../types/api";
import { useAuth } from "../../context/AuthContext";

export default function MyLearningScreen() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEnrolledCourses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await getCourseFeed({ filter: "enrolled" });
      setCourses(res.courses || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load enrolled courses", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEnrolledCourses();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Card
            course={item}
            showEnrollmentStatus={true}
            onPress={() =>
              router.push({
                pathname: "/detailspage",
                params: {
                  courseId: item._id,
                  courseData: JSON.stringify(item),
                },
              })
            }
          />
        )}
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
          <View style={styles.header}>
            <Text style={styles.title}>My Learning 📚</Text>
            <Text style={styles.subtitle}>
              {courses.length} enrolled course{courses.length === 1 ? "" : "s"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ marginTop: 12 }}>
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={56} color="#FF8383" />
              <Text style={styles.emptyTitle}>No courses enrolled yet</Text>
              <Text style={styles.emptySubtitle}>
                Explore the catalog, enroll in topics of your interest, and start your learning journey!
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push("/(tabs)/explore")}
              >
                <Text style={styles.exploreBtnText}>Browse Available Courses</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
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
    marginTop: 8,
    lineHeight: 20,
  },
  exploreBtn: {
    marginTop: 20,
    backgroundColor: "#FF8383",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  exploreBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
