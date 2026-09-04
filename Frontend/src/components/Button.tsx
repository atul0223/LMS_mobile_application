import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import theme from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

export interface ButtonProps {
    label: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Shows a spinner and blocks presses. */
    loading?: boolean;
    disabled?: boolean;
    /** Stretches to the width of the parent. */
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityHint?: string;
}

export function Button({
    label,
    onPress,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    accessibilityHint,
}: ButtonProps) {
    const isInactive = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isInactive}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isInactive, busy: loading }}
            style={({ pressed }) => [
                styles.base,
                size === "lg" ? styles.sizeLg : styles.sizeMd,
                variantStyles[variant].container,
                fullWidth && styles.fullWidth,
                pressed && !isInactive && variantStyles[variant].pressed,
                isInactive && styles.inactive,
                style,
            ]}
        >
            {/* Reserving layout with a wrapper keeps the button from resizing
                when the spinner replaces the label. */}
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={variantStyles[variant].spinnerColor}
                    />
                ) : (
                    <Text style={[styles.label, variantStyles[variant].label]} numberOfLines={1}>
                        {label}
                    </Text>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: theme.radius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: theme.layout.hairline,
        borderColor: "transparent",
    },
    sizeMd: {
        minHeight: theme.layout.minTouchTarget,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    sizeLg: {
        minHeight: 52,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
    },
    fullWidth: {
        alignSelf: "stretch",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: theme.type.body.fontSize,
        fontWeight: "600",
    },
    inactive: {
        opacity: 0.5,
    },
});

const variantStyles: Record<
    ButtonVariant,
    {
        container: ViewStyle;
        pressed: ViewStyle;
        label: { color: string };
        spinnerColor: string;
    }
> = {
    primary: {
        container: { backgroundColor: theme.colors.primary },
        pressed: { backgroundColor: theme.colors.primaryPressed },
        label: { color: theme.colors.textInverse },
        spinnerColor: theme.colors.textInverse,
    },
    secondary: {
        container: {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
        },
        pressed: { backgroundColor: theme.colors.surfaceMuted },
        label: { color: theme.colors.textPrimary },
        spinnerColor: theme.colors.textPrimary,
    },
    ghost: {
        container: { backgroundColor: "transparent" },
        pressed: { backgroundColor: theme.colors.surfaceMuted },
        label: { color: theme.colors.primary },
        spinnerColor: theme.colors.primary,
    },
    danger: {
        container: { backgroundColor: theme.colors.danger },
        pressed: { backgroundColor: theme.colors.dangerPressed },
        label: { color: theme.colors.textInverse },
        spinnerColor: theme.colors.textInverse,
    },
};

export default Button;
