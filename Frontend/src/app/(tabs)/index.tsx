import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
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
import Card from "../../components/Card";
import FilterCard from "../../components/FilterCard";
import { CourseCardSkeleton } from "../../components/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getCourseFeed, searchCourses } from "../../services/api";
import { Course } from "../../types/api";

type FeedFilterType = "all" | "popular" | "newest" | "free" | "enrolled";

const FILTER_TABS: { label: string; value: FeedFilterType }[] = [
  { label: "All Courses", value: "all" },
  { label: "Popular 🔥", value: "popular" },
  { label: "Newest ✨", value: "newest" },
  { label: "Free 🎁", value: "free" },
  { label: "My Enrolled 🎓", value: "enrolled" },
];

export default function ExploreScreen() {
  const { user, role, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<FeedFilterType>("all");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const fetchFeed = useCallback(async (filter: FeedFilterType) => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setIsSearching(false);
      const res = await getCourseFeed({ filter });
      setCourses(res.courses || []);
    } catch (err: any) {
      console.error("fetchFeed failed:", err);
      showToast(err.message || "Failed to load course feed", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, showToast]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchFeed(activeFilter);
      return;
    }
    try {
      setLoading(true);
      setIsSearching(true);
      const res = await searchCourses({ query: searchQuery.trim() });
      setCourses(res.courses || []);
    } catch (err: any) {
      showToast(err.message || "Search query failed", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(activeFilter);
  }, [activeFilter, fetchFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    if (isSearching) {
      handleSearch();
    } else {
      fetchFeed(activeFilter);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Card
            course={item}
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
          <>
            {/* Header: User Greeting & Role Badge */}
            <View style={styles.headerRow}>
              <View style={styles.userInfoLeft}>
                <View style={styles.avatarCircle}>
                  {user?.profilePic ? (
                    <Image
                      source={{ uri: user.profilePic }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <StudentSVG width="100%" height="100%" />
                  )}
                </View>
                <View>
                  <Text style={styles.greetingText}>Welcome back,</Text>
                  <Text numberOfLines={1} style={styles.userNameText}>
                    {user?.fullName || user?.username || "Learner"}
                  </Text>
                </View>
              </View>

              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {role === "teacher" ? "👨‍🏫 Teacher" : "🎓 Student"}
                </Text>
              </View>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#888"
                style={{ marginLeft: 12, marginRight: 8 }}
              />
              <TextInput
                placeholder="Search courses, skills, topics..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    fetchFeed(activeFilter);
                  }}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={handleSearch}
                style={styles.searchSubmitBtn}
              >
                <Text style={styles.searchArrow}>❯</Text>
              </TouchableOpacity>
            </View>

            {/* Horizontal Filter Tabs */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FILTER_TABS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <FilterCard
                  title={item.label}
                  active={!isSearching && activeFilter === item.value}
                  onPress={() => {
                    setSearchQuery("");
                    setActiveFilter(item.value);
                  }}
                />
              )}
              contentContainerStyle={styles.filterList}
            />

            {/* Search Results Info Banner */}
            {isSearching ? (
              <View style={styles.searchInfoBanner}>
                <Text style={styles.searchInfoText}>
                  Showing results for: <Text style={{ fontWeight: "bold" }}>"{searchQuery}"</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    fetchFeed(activeFilter);
                  }}
                >
                  <Text style={styles.clearSearchLink}>Reset Feed</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Skeleton Loading State */}
            {loading && !refreshing ? (
              <View style={{ marginTop: 8 }}>
                <CourseCardSkeleton />
                <CourseCardSkeleton />
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color="#FF8383" />
              <Text style={styles.emptyTitle}>No courses found</Text>
              <Text style={styles.emptySubtitle}>
                {isSearching
                  ? "We couldn't find any courses matching your keywords."
                  : "No courses are listed under this category right now."}
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                  fetchFeed("all");
                }}
              >
                <Text style={styles.resetBtnText}>Browse All Courses</Text>
              </TouchableOpacity>
            </View>
          ) : null
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  userInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#f5ecec",
    borderWidth: 1.5,
    borderColor: "#555",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  greetingText: {
    fontSize: 12,
    color: "#666",
  },
  userNameText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
  },
  roleTag: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF8383",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FF8383",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 24,
    height: 48,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  clearBtn: {
    padding: 6,
  },
  searchSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  searchArrow: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  filterList: {
    paddingVertical: 10,
  },
  searchInfoBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchInfoText: {
    fontSize: 13,
    color: "#555",
  },
  clearSearchLink: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FF8383",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: "#FF8383",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  resetBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
