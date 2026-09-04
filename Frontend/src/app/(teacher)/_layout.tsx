import { Tabs } from "expo-router/js-tabs";
import theme from "@/theme";

export default function TeacherLayout() {
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
            <Tabs.Screen name="index" options={{ title: "Courses" }} />
            <Tabs.Screen name="course/new" options={{ title: "New Course" }} />
            <Tabs.Screen name="course/[id]" options={{ href: null, title: "Edit Course" }} />
        </Tabs>
    );
}
