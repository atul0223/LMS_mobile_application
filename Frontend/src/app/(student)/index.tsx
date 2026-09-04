import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCourseList } from "@/lib/useCourseList";
import { useSession } from "@/lib/session";
import { Banner, Button, CourseCard, EmptyState, LoadingState, Screen } from "@/components";
import theme from "@/theme";
import type { Course, CourseFeedFilter } from "@/types/api";

const FILTERS: { value: CourseFeedFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "popular", label: "Popular" },
    { value: "newest", label: "Newest" },
    { value: "free", label: "Free" },
    { value: "enrolled", label: "My courses" },
];

export default function FeedScreen() {
    const router = useRouter();
    const { user, refreshUser, signOut } = useSession();
    const [filter, setFilter] = useState<CourseFeedFilter>("all");

    const { courses, isLoading, isRefreshing, isLoadingMore, error, refresh, loadMore } =
        useCourseList({ path: "/student/courses/feed", query: { filter } });

    // Enrollment can change while the user is away (purchase screen), so pull
    // fresh state when this tab regains focus.
    useFocusEffect(
        useCallback(() => {
            void refreshUser();
        }, [refreshUser])
    );

    const openCourse = (course: Course) => {
        router.push({
            pathname: "/(student)/course/[id]",
            params: { id: course._id, course: JSON.stringify(course) },
        });
    };

    // `standalone` adds the gutter for the loading branch, where the header is
    // rendered outside the list and so misses the list's content padding.
    const renderHeader = (standalone = false) => (
        <View style={[styles.header, standalone && styles.headerStandalone]}>
            <View style={styles.greetingRow}>
                <Text style={styles.greeting} numberOfLines={1}>
                    {user?.fullName || user?.username
                        ? `Hello, ${user.fullName || user.username}`
                        : "Browse courses"}
                </Text>
                <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
            </View>

            <View style={styles.filterRow}>
                {FILTERS.map((option) => {
                    const selected = filter === option.value;
                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => setFilter(option.value)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            style={[styles.chip, selected && styles.chipSelected]}
                        >
                            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {error ? <Banner tone="error" message={error} style={styles.banner} /> : null}
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
                    <CourseCard course={item} onPress={() => openCourse(item)} />
                )}
                ListHeaderComponent={() => renderHeader()}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refresh}
                        tintColor={theme.colors.primary}
                    />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    isLoadingMore ? (
                        <ActivityIndicator
                            style={styles.footerSpinner}
                            color={theme.colors.primary}
                        />
                    ) : null
                }
                ListEmptyComponent={
                    error ? (
                        <EmptyState
                            title="Couldn't load courses"
                            description="Check your connection and try again."
                            actionLabel="Retry"
                            onAction={refresh}
                        />
                    ) : (
                        <EmptyState
                            title={
                                filter === "enrolled"
                                    ? "No courses yet"
                                    : "Nothing here yet"
                            }
                            description={
                                filter === "enrolled"
                                    ? "Courses you enrol in will appear here."
                                    : "New courses will show up as teachers publish them."
                            }
                            actionLabel={filter === "enrolled" ? "Browse all courses" : undefined}
                            onAction={filter === "enrolled" ? () => setFilter("all") : undefined}
                        />
                    )
                }
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        // No horizontal padding — the list's contentContainerStyle already
        // applies the gutter to the header it renders.
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
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.spacing.sm,
    },
    chip: {
        borderRadius: theme.radius.pill,
        borderWidth: theme.layout.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    chipSelected: {
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.primary,
    },
    chipLabel: {
        ...theme.type.label,
        fontWeight: "600",
    },
    chipLabelSelected: {
        color: theme.colors.primary,
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
    footerSpinner: {
        paddingVertical: theme.spacing.lg,
    },
});
