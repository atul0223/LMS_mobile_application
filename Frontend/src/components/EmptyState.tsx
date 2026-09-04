import { StyleSheet, Text, View } from "react-native";
import theme from "@/theme";
import Button from "./Button";

export interface EmptyStateProps {
    title: string;
    description?: string;
    /** Optional call to action, e.g. "Create a course". */
    actionLabel?: string;
    onAction?: () => void;
}

/** Shown when a list is legitimately empty, or after a recoverable failure. */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            {actionLabel && onAction ? (
                <Button label={actionLabel} onPress={onAction} variant="secondary" />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing.huge,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    title: {
        ...theme.type.heading,
        textAlign: "center",
    },
    description: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
        textAlign: "center",
        marginBottom: theme.spacing.sm,
    },
});

export default EmptyState;
