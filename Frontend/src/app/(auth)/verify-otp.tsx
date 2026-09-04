import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Banner, Button, Screen, TextField } from "@/components";
import theme from "@/theme";
import type { AuthResponse } from "@/types/api";

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
    const router = useRouter();
    const { signIn } = useSession();
    const params = useLocalSearchParams<{ identifier?: string; reason?: string }>();

    const identifier = params.identifier ?? "";
    const fromSignup = params.reason === "signup";

    const [otp, setOtp] = useState("");
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ tone: "error" | "warning"; message: string } | null>(null);
    /** Set when the code's attempt budget is spent — only a new code helps. */
    const [budgetSpent, setBudgetSpent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const onChangeOtp = (value: string) => {
        // The server requires exactly six digits; strip anything else so the
        // field cannot hold input that is guaranteed to fail.
        setOtp(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
        setFieldError(null);
    };

    const onSubmit = async () => {
        setNotice(null);

        if (otp.length !== OTP_LENGTH) {
            setFieldError(`Enter the ${OTP_LENGTH}-digit code`);
            return;
        }

        setSubmitting(true);
        try {
            const result = await api.post<AuthResponse>(
                "/user/verifyOtp",
                { identifier, otp },
                { anonymous: true }
            );
            await signIn(result.accessToken);
            // Guards in the root layout route by role from here.
        } catch (error) {
            if (!(error instanceof ApiError)) {
                setNotice({ tone: "error", message: "Something went wrong. Please try again." });
                return;
            }

            if (error.status === 429) {
                // Budget exhausted: further guesses fail even if correct.
                setBudgetSpent(true);
                setNotice({
                    tone: "warning",
                    message:
                        "Too many incorrect attempts. Sign in again to have a new code sent to your email.",
                });
                return;
            }

            setNotice({
                tone: "error",
                message: error.isNetworkError ? error.message : "That code is invalid or has expired.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen edges={["bottom", "left", "right"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Check your email</Text>
                        <Text style={styles.subtitle}>
                            {fromSignup
                                ? "If those details were available, we sent a 6-digit code to your email address. Enter it below to finish setting up your account."
                                : "We sent a 6-digit code to the email on your account. Enter it below to continue."}
                        </Text>
                    </View>

                    {notice ? <Banner tone={notice.tone} message={notice.message} /> : null}

                    <View style={styles.form}>
                        <TextField
                            label="Verification code"
                            value={otp}
                            onChangeText={onChangeOtp}
                            placeholder="000000"
                            error={fieldError}
                            keyboardType="number-pad"
                            textContentType="oneTimeCode"
                            autoComplete="one-time-code"
                            maxLength={OTP_LENGTH}
                            editable={!budgetSpent}
                            centered
                            returnKeyType="go"
                            onSubmitEditing={onSubmit}
                            hint="The code expires 10 minutes after it was sent."
                        />

                        <Button
                            label="Verify and continue"
                            onPress={onSubmit}
                            loading={submitting}
                            disabled={budgetSpent}
                            size="lg"
                            fullWidth
                        />

                        <Button
                            label={budgetSpent ? "Back to sign in" : "Use a different account"}
                            variant="ghost"
                            onPress={() => router.replace("/(auth)/login")}
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
        gap: theme.layout.sectionGap,
        paddingVertical: theme.spacing.xl,
    },
    header: {
        gap: theme.spacing.sm,
    },
    title: {
        ...theme.type.title,
    },
    subtitle: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
    },
    form: {
        gap: theme.spacing.lg,
    },
});
