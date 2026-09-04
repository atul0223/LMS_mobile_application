import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components";
import theme from "@/theme";

/**
 * PLACEHOLDER — owned by Agent B (see FRONTEND_PLAN.md, Part 2 §1).
 *
 * Exists so typed routes resolve and the app runs end to end. Replace entirely
 * with the course detail and purchase screen; do not build on top of this.
 *
 * The feed and search screens navigate here with:
 *   params: { id, course: JSON.stringify(course) }
 * so the full Course object is available without a per-course GET endpoint.
 */
export default function CourseDetailPlaceholder() {
    const { id } = useLocalSearchParams<{ id: string; course?: string }>();

    return (
        <Screen>
            <View style={styles.container}>
                <Text style={styles.title}>Course detail</Text>
                <Text style={styles.body}>
                    This screen is not built yet. Course id: {id}
                </Text>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
    },
    title: {
        ...theme.type.heading,
    },
    body: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
        textAlign: "center",
    },
});
