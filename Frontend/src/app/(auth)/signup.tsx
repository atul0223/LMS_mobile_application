import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { Banner, Button, Screen, TextField } from "@/components";
import theme from "@/theme";
import type { Role } from "@/types/api";

interface SignupResponse {
    message: string;
    requiresOtp?: boolean;
    emailVerify?: boolean;
}

const ROLES: { value: Role; label: string; description: string }[] = [
    { value: "student", label: "Student", description: "Browse and enrol in courses" },
    { value: "teacher", label: "Teacher", description: "Create and publish courses" },
];

export default function SignupScreen() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<Role>("student");

    const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
    const [notice, setNotice] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const errors: Record<string, string | undefined> = {};
        if (!username.trim()) errors.username = "Choose a username";
        if (!email.trim()) {
            errors.email = "Enter your email";
        } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            errors.email = "Enter a valid email address";
        }
        if (!password) {
            errors.password = "Choose a password";
        } else if (password.length < 8) {
            errors.password = "Use at least 8 characters";
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const onSubmit = async () => {
        setNotice(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            await api.post<SignupResponse>(
                "/user/customSignup",
                {
                    username: username.trim(),
                    email: email.trim(),
                    fullName: fullName.trim(),
                    password,
                    role,
                },
                { anonymous: true }
            );

            // The server answers uniformly whether or not the identifier was
            // taken, so it cannot be used to enumerate accounts. Move to OTP
            // entry either way and let verification decide.
            router.replace({
                pathname: "/(auth)/verify-otp",
                params: { identifier: username.trim(), reason: "signup" },
            });
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 429) {
                    setNotice("Too many attempts. Please wait a few minutes and try again.");
                } else {
                    setNotice(error.message);
                }
            } else {
                setNotice("Something went wrong. Please try again.");
            }
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
                    {notice ? <Banner tone="error" message={notice} /> : null}

                    <View style={styles.form}>
                        <TextField
                            label="Full name"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Ada Lovelace"
                            autoCapitalize="words"
                            textContentType="name"
                            hint="Optional"
                        />

                        <TextField
                            label="Username"
                            value={username}
                            onChangeText={(value) => {
                                setUsername(value);
                                setFieldErrors((prev) => ({ ...prev, username: undefined }));
                            }}
                            placeholder="adalovelace"
                            error={fieldErrors.username}
                            autoComplete="username-new"
                        />

                        <TextField
                            label="Email"
                            value={email}
                            onChangeText={(value) => {
                                setEmail(value);
                                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                            }}
                            placeholder="you@example.com"
                            error={fieldErrors.email}
                            keyboardType="email-address"
                            autoComplete="email"
                            textContentType="emailAddress"
                        />

                        <TextField
                            label="Password"
                            value={password}
                            onChangeText={(value) => {
                                setPassword(value);
                                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                            }}
                            placeholder="At least 8 characters"
                            error={fieldErrors.password}
                            secureTextEntry
                            autoComplete="password-new"
                            textContentType="newPassword"
                        />

                        <View style={styles.roleSection}>
                            <Text style={styles.roleLabel}>I am joining as</Text>
                            <View style={styles.roleRow}>
                                {ROLES.map((option) => {
                                    const selected = role === option.value;
                                    return (
                                        <Pressable
                                            key={option.value}
                                            onPress={() => setRole(option.value)}
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected }}
                                            accessibilityLabel={option.label}
                                            style={[
                                                styles.roleOption,
                                                selected && styles.roleOptionSelected,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.roleTitle,
                                                    selected && styles.roleTitleSelected,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            <Text style={styles.roleDescription}>
                                                {option.description}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        <Button
                            label="Create account"
                            onPress={onSubmit}
                            loading={submitting}
                            size="lg"
                            fullWidth
                        />

                        <Text style={styles.disclaimer}>
                            We&apos;ll email a 6-digit code to verify your address.
                        </Text>
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
    form: {
        gap: theme.spacing.lg,
    },
    roleSection: {
        gap: theme.spacing.sm,
    },
    roleLabel: {
        ...theme.type.label,
    },
    roleRow: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    roleOption: {
        flex: 1,
        minHeight: theme.layout.minTouchTarget,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.layout.hairline,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    roleOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primarySoft,
    },
    roleTitle: {
        ...theme.type.body,
        fontWeight: "600",
    },
    roleTitleSelected: {
        color: theme.colors.primary,
    },
    roleDescription: {
        ...theme.type.caption,
    },
    disclaimer: {
        ...theme.type.caption,
        textAlign: "center",
    },
});
