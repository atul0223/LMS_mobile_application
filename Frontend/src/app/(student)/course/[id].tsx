import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Button, Banner, Card, Badge, formatPrice, LoadingState, EmptyState } from "@/components";
import theme from "@/theme";
import api from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Course, CourseListResponse } from "@/types/api";

export default function CourseDetailScreen() {
    const { id, course: courseParam } = useLocalSearchParams<{ id: string; course?: string }>();
    const router = useRouter();
    const { refreshUser } = useSession();

    const [course, setCourse] = useState<Course | null>(
        courseParam ? JSON.parse(courseParam) : null
    );
    const [isLoading, setIsLoading] = useState(!courseParam);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);

    useEffect(() => {
        if (!courseParam) {
            fetchCourse();
        }
    }, [courseParam]);

    /**
     * Fallback for a cold deep link, where the serialized course param is
     * missing. There is no single-course endpoint, so page through the feed
     * until the id turns up rather than reading only the first page.
     */
    const fetchCourse = async () => {
        try {
            setIsLoading(true);
            setErrorMsg(null);

            const LIMIT = 100; // the server's maximum page size
            let page = 1;
            let totalPages = 1;

            do {
                const res = await api.get<CourseListResponse>("/student/courses/feed", {
                    query: { filter: "all", page, limit: LIMIT },
                });
                const found = res.courses.find((c) => c._id === id);
                if (found) {
                    setCourse(found);
                    return;
                }
                totalPages = res.pagination?.totalPages ?? 1;
                page += 1;
            } while (page <= totalPages);

            setErrorMsg("This course is no longer available.");
        } catch (err: any) {
            if (err.status !== 401) {
                setErrorMsg(err.message || "Failed to load course.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = () => {
        Alert.alert(
            "Confirm Purchase",
            "Are you sure you want to purchase this course? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Purchase",
                    onPress: async () => {
                        try {
                            setIsPurchasing(true);
                            setPurchaseError(null);
                            await api.post("/student/courses/purchase", { courseId: id });
                            
                            // Success
                            setPurchaseSuccess(true);
                            setCourse((prev) => prev ? { ...prev, isEnrolled: true } : prev);
                            await refreshUser();
                        } catch (err: any) {
                            if (err.status === 409) {
                                // Already purchased
                                setPurchaseSuccess(true);
                                setCourse((prev) => prev ? { ...prev, isEnrolled: true } : prev);
                                await refreshUser();
                            } else if (err.status === 403 || err.status === 429) {
                                setPurchaseError(err.message || "Purchase failed.");
                            } else {
                                setPurchaseError("Failed to purchase course.");
                            }
                        } finally {
                            setIsPurchasing(false);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (errorMsg || !course) {
        return (
            <Screen>
                <EmptyState
                    title="Course Not Found"
                    description={errorMsg || "This course could not be loaded."}
                    actionLabel="Go Back"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const isEnrolled = course.isEnrolled || purchaseSuccess;

    return (
        <Screen edges={["top", "bottom"]} padded={false}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {purchaseSuccess && (
                    <Banner tone="success" message="Successfully enrolled in the course." />
                )}
                {purchaseError && (
                    <Banner tone="error" message={purchaseError} />
                )}

                <View style={styles.header}>
                    <Text style={styles.title}>{course.name}</Text>
                    {typeof course.owner === "object" && course.owner?.fullName && (
                        <Text style={styles.owner}>by {course.owner.fullName}</Text>
                    )}
                    {isEnrolled ? (
                        <Badge label="Enrolled" tone="success" style={styles.badge} />
                    ) : (
                        <Text style={styles.price}>{formatPrice(course.price)}</Text>
                    )}
                </View>

                {course.courseDescription && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{course.courseDescription}</Text>
                    </View>
                )}

                <View style={styles.footer}>
                    {isEnrolled ? (
                        <Button
                            label="Watch Course"
                            onPress={() => router.push({ pathname: "/(student)/watch/[courseId]", params: { courseId: course._id } })}
                        />
                    ) : (
                        <Button
                            label="Purchase"
                            onPress={handlePurchase}
                            loading={isPurchasing}
                            disabled={isPurchasing}
                        />
                    )}
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: theme.spacing.lg,
        gap: theme.spacing.xl,
    },
    header: {
        gap: theme.spacing.sm,
        alignItems: "flex-start",
    },
    title: {
        ...theme.type.display,
        color: theme.colors.textPrimary,
    },
    owner: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
    },
    price: {
        ...theme.type.title,
        color: theme.colors.primary,
        marginTop: theme.spacing.sm,
    },
    badge: {
        marginTop: theme.spacing.sm,
    },
    section: {
        gap: theme.spacing.sm,
    },
    sectionTitle: {
        ...theme.type.heading,
        color: theme.colors.textPrimary,
    },
    description: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
    },
    footer: {
        marginTop: theme.spacing.xl,
    },
});
