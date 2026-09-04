import { useState, useCallback, useEffect, useRef } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen, CourseCard, Button, EmptyState, LoadingState, Banner } from "@/components";
import { useSession } from "@/lib/session";
import api from "@/lib/api";
import theme from "@/theme";
import type { Course, TeacherCoursesResponse } from "@/types/api";

export default function TeacherCoursesScreen() {
    const router = useRouter();
    const { user, signOut } = useSession();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchCourses = useCallback(async () => {
        try {
            setErrorMsg(null);
            const res = await api.get<TeacherCoursesResponse>("/teacher/courses");
            setCourses(res.courses || []);
        } catch (err: any) {
            // 401 is handled centrally by the API client; showing it here would
            // flash an error during the sign-out redirect.
            if (err.status !== 401) {
                setErrorMsg(err.message || "Failed to load courses.");
            }
        }
    }, []);

    const loadInitial = useCallback(async () => {
        setIsLoading(true);
        await fetchCourses();
        setIsLoading(false);
    }, [fetchCourses]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchCourses();
        setIsRefreshing(false);
    }, [fetchCourses]);

    // First load owns the full-screen spinner.
    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    // Subsequent focuses revalidate quietly so a course created or deleted
    // elsewhere shows up without the list flashing back to a spinner.
    const hasLoadedOnce = useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (!hasLoadedOnce.current) {
                hasLoadedOnce.current = true;
                return;
            }
            void fetchCourses();
        }, [fetchCourses])
    );

    const openCourse = (course: Course) => {
        router.push({
            pathname: "/(teacher)/course/[id]",
            params: { id: course._id, course: JSON.stringify(course) },
        });
    };

    const renderHeader = (standalone = false) => (
        <View style={[styles.header, standalone && styles.headerStandalone]}>
            <View style={styles.greetingRow}>
                <Text style={styles.greeting} numberOfLines={1}>
                    {user?.fullName || user?.username
                        ? `Hello, ${user.fullName || user.username}`
                        : "My courses"}
                </Text>
                <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
            </View>
            {errorMsg ? <Banner tone="error" message={errorMsg} style={styles.banner} /> : null}
        </View>
    );

    if (isLoading && courses.length === 0) {
        return (
            <Screen padded={false}>
                {renderHeader(true)}
                <LoadingState />
            </Screen>
        );
    }

    return (
        <Screen padded={false}>
            <FlatList
                data={courses}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <CourseCard variant="teacher" course={item} onPress={() => openCourse(item)} />
                )}
                ListHeaderComponent={() => renderHeader()}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    errorMsg ? (
                        <EmptyState
                            title="Couldn't load courses"
                            description="Check your connection and try again."
                            actionLabel="Retry"
                            onAction={loadInitial}
                        />
                    ) : (
                        <EmptyState
                            title="No courses yet"
                            description="Create your first course to start teaching."
                            actionLabel="Create Course"
                            onAction={() => router.push("/(teacher)/course/new")}
                        />
                    )
                }
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        gap: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    headerStandalone: {
        paddingHorizontal: theme.layout.gutter,
    },
    greetingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
    },
    greeting: {
        ...theme.type.title,
        flex: 1,
    },
    banner: {
        marginTop: theme.spacing.xs,
    },
    listContent: {
        paddingHorizontal: theme.layout.gutter,
        paddingBottom: theme.spacing.xxxl,
        flexGrow: 1,
    },
    separator: {
        height: theme.spacing.md,
    },
});
