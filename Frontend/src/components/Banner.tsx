import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import theme from "@/theme";

export type BannerTone = "error" | "warning" | "success" | "info";

export interface BannerProps {
    message: string;
    tone?: BannerTone;
    /** Optional heading above the message. */
    title?: string;
    style?: StyleProp<ViewStyle>;
}

/**
 * Inline notice tied to the surrounding content — used for form-level errors,
 * lockout warnings, and confirmations. Not a toast; it occupies layout space.
 */
export function Banner({ message, tone = "info", title, style }: BannerProps) {
    const palette = tones[tone];

    return (
        <View
            accessibilityRole="alert"
            accessibilityLiveRegion={tone === "error" ? "assertive" : "polite"}
            style={[
                styles.banner,
                { backgroundColor: palette.background, borderColor: palette.border },
                style,
            ]}
        >
            {title ? <Text style={[styles.title, { color: palette.text }]}>{title}</Text> : null}
            <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
        </View>
    );
}

const tones: Record<BannerTone, { background: string; border: string; text: string }> = {
    error: {
        background: theme.colors.dangerSoft,
        border: theme.colors.danger,
        text: theme.colors.danger,
    },
    warning: {
        background: theme.colors.warningSoft,
        border: theme.colors.warning,
        text: theme.colors.warning,
    },
    success: {
        background: theme.colors.successSoft,
        border: theme.colors.success,
        text: theme.colors.success,
    },
    info: {
        background: theme.colors.infoSoft,
        border: theme.colors.info,
        text: theme.colors.info,
    },
};

const styles = StyleSheet.create({
    banner: {
        borderRadius: theme.radius.md,
        // Only the leading edge is colored, so the notice reads as attached to
        // the content rather than as a floating alert.
        borderLeftWidth: 3,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    title: {
        fontSize: theme.type.label.fontSize,
        lineHeight: theme.type.label.lineHeight,
        fontWeight: "600",
    },
    message: {
        fontSize: theme.type.label.fontSize,
        lineHeight: theme.type.label.lineHeight,
    },
});

export default Banner;
