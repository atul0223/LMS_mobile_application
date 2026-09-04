import { Stack } from "expo-router";
import theme from "@/theme";

/**
 * PLACEHOLDER — owned by Agent B (see FRONTEND_PLAN.md, Part 2 §3).
 *
 * A Stack so the route group resolves. Replace with the Courses / New Course
 * tab layout, styled to match `(student)/_layout.tsx` exactly.
 */
export default function TeacherLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.textPrimary,
                headerTitleStyle: {
                    fontSize: theme.type.heading.fontSize,
                    fontWeight: theme.type.heading.fontWeight,
                },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: "My courses" }} />
        </Stack>
    );
}
