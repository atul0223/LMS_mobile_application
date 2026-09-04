import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useCourseList } from "@/lib/useCourseList";
import { Banner, CourseCard, EmptyState, LoadingState, Screen, TextField } from "@/components";
import theme from "@/theme";
import type { Course } from "@/types/api";

/** Waits for a pause in typing before querying, to avoid a request per keypress. */
const DEBOUNCE_MS = 350;

export default function SearchScreen() {
    const router = useRouter();

    const [input, setInput] = useState("");
    const [debounced, setDebounced] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [input]);

    const priceFilters = useMemo(() => {
        const parse = (value: string) => {
            const trimmed = value.trim();
            if (!trimmed) return undefined;
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
        };
        return { minPrice: parse(minPrice), maxPrice: parse(maxPrice) };
    }, [minPrice, maxPrice]);

    const hasCriteria =
        debounced.length > 0 ||
        priceFilters.minPrice !== undefined ||
        priceFilters.maxPrice !== undefined;

    const { courses, isLoading, isLoadingMore, error, loadMore } = useCourseList({
        path: "/student/courses/search",
        query: { query: debounced, ...priceFilters },
        enabled: hasCriteria,
    });

    const openCourse = (course: Course) => {
        router.push({
            pathname: "/(student)/course/[id]",
            params: { id: course._id, course: JSON.stringify(course) },
        });
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TextField
                label="Search courses"
                value={input}
                onChangeText={setInput}
                placeholder="Topic, title, or keyword"
                returnKeyType="search"
            />

            <View style={styles.priceRow}>
                <TextField
                    label="Min price"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    placeholder="0"
                    keyboardType="number-pad"
                    style={styles.priceField}
                />
                <TextField
                    label="Max price"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    placeholder="Any"
                    keyboardType="number-pad"
                    style={styles.priceField}
                />
            </View>

            {error ? <Banner tone="error" message={error} /> : null}
        </View>
    );

    return (
        <Screen padded={false}>
            <FlatList
                data={hasCriteria ? courses : []}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <CourseCard course={item} onPress={() => openCourse(item)} />
                )}
                ListHeaderComponent={renderHeader}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
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
                    !hasCriteria ? (
                        <EmptyState
                            title="Find a course"
                            description="Search by title or description, or filter by price."
                        />
                    ) : isLoading ? (
                        <LoadingState fullscreen={false} />
                    ) : error ? (
                        <EmptyState
                            title="Search failed"
                            description="Check your connection and try again."
                        />
                    ) : (
                        <EmptyState
                            title="No matches"
                            description="Try a different keyword or widen your price range."
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
    priceRow: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    priceField: {
        flex: 1,
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
