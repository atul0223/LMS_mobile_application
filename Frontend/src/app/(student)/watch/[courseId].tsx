import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components";
import theme from "@/theme";

/**
 * PLACEHOLDER — owned by Agent B (see FRONTEND_PLAN.md, Part 2 §2).
 *
 * Exists so typed routes resolve and the app runs end to end. Replace entirely
 * with the expo-video player and lesson list.
 *
 * Remember: GET /videos/course/:courseId returns short-lived signed HLS URLs
 * with `urlExpiresInSeconds`. They must not be cached — refetch to re-sign.
 */
export default function WatchPlaceholder() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();

    return (
        <Screen>
            <View style={styles.container}>
                <Text style={styles.title}>Player</Text>
                <Text style={styles.body}>
                    This screen is not built yet. Course id: {courseId}
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
