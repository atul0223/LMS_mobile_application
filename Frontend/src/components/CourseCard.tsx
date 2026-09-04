import { StyleSheet, Text, View } from "react-native";
import theme from "@/theme";
import type { Course } from "@/types/api";
import Badge from "./Badge";
import Card from "./Card";

export interface CourseCardProps {
    course: Course;
    onPress?: () => void;
    /**
     * Teacher context: shows the enrolled-student count instead of the course
     * owner, since the viewer is the owner.
     */
    variant?: "student" | "teacher";
}

/** Formats a price for display; absent or zero reads as "Free". */
export const formatPrice = (price?: number): string =>
    !price || price <= 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`;

const ownerName = (course: Course): string | null => {
    const { owner } = course;
    if (!owner || typeof owner === "string") return null;
    return owner.fullName || owner.username || null;
};

/**
 * The canonical course row. Used by the student feed, search, and the teacher
 * course list so a course looks identical everywhere it appears.
 */
export function CourseCard({ course, onPress, variant = "student" }: CourseCardProps) {
    const teacher = ownerName(course);
    const students = course.enrolledStudentCount ?? 0;

    return (
        <Card onPress={onPress} accessibilityLabel={course.name} style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={2}>
                    {course.name}
                </Text>
                {course.isEnrolled ? <Badge label="Enrolled" tone="success" /> : null}
            </View>

            {course.courseDescription ? (
                <Text style={styles.description} numberOfLines={2}>
                    {course.courseDescription}
                </Text>
            ) : null}

            <View style={styles.footer}>
                <Text style={styles.price}>{formatPrice(course.price)}</Text>

                <Text style={styles.meta} numberOfLines={1}>
                    {variant === "teacher"
                        ? `${students} ${students === 1 ? "student" : "students"}`
                        : (teacher ?? `${students} enrolled`)}
                </Text>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: theme.spacing.sm,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
    },
    title: {
        ...theme.type.heading,
        flex: 1,
    },
    description: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    price: {
        ...theme.type.body,
        fontWeight: "600",
        color: theme.colors.textPrimary,
    },
    meta: {
        ...theme.type.caption,
        flexShrink: 1,
        textAlign: "right",
    },
});

export default CourseCard;
