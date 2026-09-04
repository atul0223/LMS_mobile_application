import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import theme from "@/theme";

export interface ScreenProps {
    children: ReactNode;
    /**
     * Which insets to respect. Screens under a header or tab bar usually pass a
     * narrower set, since the navigator already handles those edges.
     */
    edges?: readonly Edge[];
    /** Adds the standard horizontal gutter. Off for full-bleed lists. */
    padded?: boolean;
    style?: StyleProp<ViewStyle>;
}

/**
 * Standard screen frame: background color, safe-area insets, and a centered
 * content column that stops widening on tablets.
 */
export function Screen({
    children,
    edges = ["top", "bottom", "left", "right"],
    padded = true,
    style,
}: ScreenProps) {
    return (
        <SafeAreaView style={styles.safeArea} edges={edges}>
            <View style={[styles.content, padded && styles.padded, style]}>{children}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        width: "100%",
        maxWidth: theme.layout.maxContentWidth,
        alignSelf: "center",
    },
    padded: {
        paddingHorizontal: theme.layout.gutter,
    },
});

export default Screen;
