import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Banner, Button, Screen, TextField } from "@/components";
import theme from "@/theme";
import type { AuthResponse, OtpRequiredResponse } from "@/types/api";

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useSession();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
    const [notice, setNotice] = useState<{ tone: "error" | "warning"; message: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const errors: typeof fieldErrors = {};
        if (!identifier.trim()) errors.identifier = "Enter your username or email";
        if (!password) errors.password = "Enter your password";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const onSubmit = async () => {
        setNotice(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            const result = await api.post<AuthResponse>(
                "/user/login",
                { identifier: identifier.trim(), password },
                { anonymous: true }
            );
            await signIn(result.accessToken);
            // The root layout's guards take over from here.
        } catch (error) {
            if (!(error instanceof ApiError)) {
                setNotice({ tone: "error", message: "Something went wrong. Please try again." });
                return;
            }

            const body = error.body as OtpRequiredResponse | null;

            // 403 + requiresOtp is not a failure — the account exists but the
            // email is unverified, and the server has already sent a code.
            if (error.status === 403 && body?.requiresOtp) {
                router.push({
                    pathname: "/(auth)/verify-otp",
                    params: { identifier: identifier.trim(), reason: "verify" },
                });
                return;
            }

            if (error.status === 429) {
                const seconds = body?.retryAfterSeconds;
                setNotice({
                    tone: "warning",
                    message: seconds
                        ? `Too many attempts. Try again in about ${Math.ceil(seconds / 60)} minute(s).`
                        : error.message,
                });
                return;
            }

            if (error.status === 400) {
                setNotice({ tone: "error", message: error.message });
                return;
            }

            // 401 is deliberately uniform on the server so it cannot be used to
            // discover which accounts exist; keep it uniform here too.
            setNotice({
                tone: "error",
                message: error.isNetworkError ? error.message : "Incorrect username or password.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>Sign in to continue learning.</Text>
                    </View>

                    {notice ? <Banner tone={notice.tone} message={notice.message} /> : null}

                    <View style={styles.form}>
                        <TextField
                            label="Username or email"
                            value={identifier}
                            onChangeText={(value) => {
                                setIdentifier(value);
                                setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                            }}
                            placeholder="you@example.com"
                            error={fieldErrors.identifier}
                            keyboardType="email-address"
                            autoComplete="username"
                            textContentType="username"
                            returnKeyType="next"
                        />

                        <TextField
                            label="Password"
                            value={password}
                            onChangeText={(value) => {
                                setPassword(value);
                                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                            }}
                            placeholder="Your password"
                            error={fieldErrors.password}
                            secureTextEntry
                            autoComplete="current-password"
                            textContentType="password"
                            returnKeyType="go"
                            onSubmitEditing={onSubmit}
                        />

                        <Button
                            label="Sign in"
                            onPress={onSubmit}
                            loading={submitting}
                            size="lg"
                            fullWidth
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New here?</Text>
                        <Button
                            label="Create an account"
                            variant="ghost"
                            onPress={() => router.push("/(auth)/signup")}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: {
        flexGrow: 1,
        justifyContent: "center",
        gap: theme.layout.sectionGap,
        paddingVertical: theme.spacing.xxxl,
    },
    header: {
        gap: theme.spacing.xs,
    },
    title: {
        ...theme.type.display,
    },
    subtitle: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
    },
    form: {
        gap: theme.spacing.lg,
    },
    footer: {
        alignItems: "center",
        gap: theme.spacing.xs,
    },
    footerText: {
        ...theme.type.label,
    },
});
