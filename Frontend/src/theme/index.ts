import type { TextStyle } from "react-native";
import { colors } from "./colors";

/**
 * Design tokens. Screens and components read from here rather than declaring
 * their own values, so spacing and type stay consistent across the app.
 */

/** 4pt base scale. */
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
} as const;

export const radius = {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
} as const;

/**
 * Type ramp. Each entry is a complete text style so callers spread one token
 * instead of assembling size/weight/height by hand.
 */
export const type = {
    display: {
        fontSize: 28,
        lineHeight: 34,
        fontWeight: "700",
        color: colors.textPrimary,
    },
    title: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: "700",
        color: colors.textPrimary,
    },
    heading: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: "600",
        color: colors.textPrimary,
    },
    body: {
        fontSize: 15,
        lineHeight: 21,
        fontWeight: "400",
        color: colors.textPrimary,
    },
    label: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "400",
        color: colors.textSecondary,
    },
} satisfies Record<string, TextStyle>;

export const layout = {
    /** Content never stretches past this; it stays centered on wide screens. */
    maxContentWidth: 560,
    /** Standard horizontal gutter. */
    gutter: spacing.lg,
    /** Vertical gap between major sections. */
    sectionGap: spacing.xl,
    /** Minimum touch target per platform accessibility guidance. */
    minTouchTarget: 44,
    /** Standard hairline; RN has no sub-pixel border on all densities. */
    hairline: 1,
} as const;

export const theme = {
    colors,
    spacing,
    radius,
    type,
    layout,
} as const;

export { colors };
export default theme;
