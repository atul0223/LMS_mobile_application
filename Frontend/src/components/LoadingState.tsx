import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import theme from "@/theme";

export interface LoadingStateProps {
    /** Optional context, e.g. "Uploading video…". */
    message?: string;
    /** Fills the available space and centers; off when inline in a list. */
    fullscreen?: boolean;
}

export function LoadingState({ message, fullscreen = true }: LoadingStateProps) {
    return (
        <View style={[styles.container, fullscreen && styles.fullscreen]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing.xxl,
        gap: theme.spacing.md,
    },
    fullscreen: {
        flex: 1,
    },
    message: {
        ...theme.type.label,
        textAlign: "center",
    },
});

export default LoadingState;
