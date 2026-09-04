import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import theme from "@/theme";

export interface CardProps {
    children: ReactNode;
    /** When provided the card becomes pressable and reports as a button. */
    onPress?: () => void;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}

/**
 * Surface container: white, hairline border, no shadow. Depth comes from the
 * border against the muted background rather than elevation.
 */
export function Card({ children, onPress, disabled, style, accessibilityLabel }: CardProps) {
    if (!onPress) {
        return <View style={[styles.card, style]}>{children}</View>;
    }

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
                styles.card,
                pressed && !disabled && styles.pressed,
                disabled && styles.disabled,
                style,
            ]}
        >
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderWidth: theme.layout.hairline,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.spacing.lg,
    },
    pressed: {
        backgroundColor: theme.colors.surfaceMuted,
    },
    disabled: {
        opacity: 0.6,
    },
});

export default Card;
