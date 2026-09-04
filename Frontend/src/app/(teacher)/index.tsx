import { StyleSheet, View } from "react-native";
import { useSession } from "@/lib/session";
import { Button, EmptyState, Screen } from "@/components";
import theme from "@/theme";

/**
 * PLACEHOLDER — owned by Agent B (see FRONTEND_PLAN.md, Part 2 §3).
 *
 * Gives a signed-in teacher a working screen (and a way to sign out) until the
 * real course list is built. Replace entirely.
 */
export default function TeacherHomePlaceholder() {
    const { user, signOut } = useSession();

    return (
        <Screen>
            <View style={styles.container}>
                <EmptyState
                    title={`Signed in as ${user?.fullName || user?.username || "teacher"}`}
                    description="The teacher area is not built yet."
                />
                <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        gap: theme.spacing.lg,
    },
});
