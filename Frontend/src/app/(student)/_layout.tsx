import { Tabs } from "expo-router/js-tabs";
import theme from "@/theme";

/**
 * Student area. Text-only tabs — no icon set is bundled, and labels alone suit
 * the restrained visual language better than a mismatched icon font would.
 */
export default function StudentLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.textPrimary,
                headerTitleStyle: {
                    fontSize: theme.type.heading.fontSize,
                    fontWeight: theme.type.heading.fontWeight,
                },
                headerShadowVisible: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: theme.layout.hairline,
                },
                tabBarLabelStyle: {
                    fontSize: theme.type.caption.fontSize,
                    fontWeight: "600",
                },
                sceneStyle: { backgroundColor: theme.colors.background },
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Browse" }} />
            <Tabs.Screen name="search" options={{ title: "Search" }} />

            {/* Detail and playback are pushed routes, not tabs. */}
            <Tabs.Screen name="course/[id]" options={{ href: null }} />
            <Tabs.Screen name="watch/[courseId]" options={{ href: null }} />
        </Tabs>
    );
}
