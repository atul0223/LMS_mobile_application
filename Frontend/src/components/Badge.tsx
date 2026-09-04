import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import theme from "@/theme";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
    label: string;
    tone?: BadgeTone;
    style?: StyleProp<ViewStyle>;
}

/** Compact status pill. Tone carries the meaning; never used decoratively. */
export function Badge({ label, tone = "neutral", style }: BadgeProps) {
    const palette = tones[tone];

    return (
        <View style={[styles.badge, { backgroundColor: palette.background }, style]}>
            <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const tones: Record<BadgeTone, { background: string; text: string }> = {
    neutral: { background: theme.colors.surfaceMuted, text: theme.colors.textSecondary },
    success: { background: theme.colors.successSoft, text: theme.colors.success },
    warning: { background: theme.colors.warningSoft, text: theme.colors.warning },
    danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
    info: { background: theme.colors.infoSoft, text: theme.colors.info },
};

const styles = StyleSheet.create({
    badge: {
        alignSelf: "flex-start",
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    label: {
        fontSize: theme.type.caption.fontSize,
        lineHeight: theme.type.caption.lineHeight,
        fontWeight: "600",
    },
});

export default Badge;
