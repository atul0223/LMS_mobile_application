import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";
import { LoadingState } from "@/components";

/**
 * Entry route. Sends the user to the area matching their role; the root layout's
 * guards enforce it from there.
 */
export default function Index() {
    const { token, user, isLoading } = useSession();

    if (isLoading) {
        return <LoadingState />;
    }

    if (!token || !user) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href={user.role === "teacher" ? "/(teacher)" : "/(student)"} />;
}
