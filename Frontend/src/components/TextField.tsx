import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type KeyboardTypeOptions,
    type StyleProp,
    type TextInputProps,
    type ViewStyle,
} from "react-native";
import theme from "@/theme";

export interface TextFieldProps {
    label?: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    /** Renders below the field and turns the border red. */
    error?: string | null;
    /** Supporting text shown when there is no error. */
    hint?: string;
    secureTextEntry?: boolean;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: TextInputProps["autoCapitalize"];
    autoComplete?: TextInputProps["autoComplete"];
    textContentType?: TextInputProps["textContentType"];
    maxLength?: number;
    multiline?: boolean;
    editable?: boolean;
    returnKeyType?: TextInputProps["returnKeyType"];
    onSubmitEditing?: () => void;
    style?: StyleProp<ViewStyle>;
    /** Centers and letter-spaces the text, for OTP entry. */
    centered?: boolean;
}

export function TextField({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    hint,
    secureTextEntry,
    keyboardType,
    autoCapitalize = "none",
    autoComplete,
    textContentType,
    maxLength,
    multiline = false,
    editable = true,
    returnKeyType,
    onSubmitEditing,
    style,
    centered = false,
}: TextFieldProps) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={[styles.wrapper, style]}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete}
                textContentType={textContentType}
                maxLength={maxLength}
                multiline={multiline}
                editable={editable}
                returnKeyType={returnKeyType}
                onSubmitEditing={onSubmitEditing}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel={label}
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    centered && styles.inputCentered,
                    focused && styles.inputFocused,
                    // Error outranks focus so the field stays visibly invalid
                    // while the user is correcting it.
                    !!error && styles.inputError,
                    !editable && styles.inputDisabled,
                ]}
            />

            {error ? (
                <Text style={styles.error}>{error}</Text>
            ) : hint ? (
                <Text style={styles.hint}>{hint}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: theme.spacing.xs,
    },
    label: {
        ...theme.type.label,
    },
    input: {
        minHeight: theme.layout.minTouchTarget,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.layout.hairline,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        fontSize: theme.type.body.fontSize,
        color: theme.colors.textPrimary,
    },
    inputMultiline: {
        minHeight: 96,
        textAlignVertical: "top",
    },
    inputCentered: {
        textAlign: "center",
        fontSize: theme.type.title.fontSize,
        letterSpacing: 8,
    },
    inputFocused: {
        borderColor: theme.colors.borderStrong,
    },
    inputError: {
        borderColor: theme.colors.danger,
    },
    inputDisabled: {
        backgroundColor: theme.colors.surfaceMuted,
        color: theme.colors.textTertiary,
    },
    error: {
        ...theme.type.caption,
        color: theme.colors.danger,
    },
    hint: {
        ...theme.type.caption,
    },
});

export default TextField;
