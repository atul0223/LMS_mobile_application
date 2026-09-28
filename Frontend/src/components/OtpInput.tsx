import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface OtpInputProps {
  length?: number;
  loading?: boolean;
  value?: string;
  onChange?: (otp: string) => void;
  onSubmit: (otp: string) => void;
  onResend?: () => void;
  resendCooldown?: number;
  resendLoading?: boolean;
  submitButtonText?: string;
}

export default function OtpInput({
  length = 6,
  loading = false,
  value: controlledValue,
  onChange,
  onSubmit,
  onResend,
  resendCooldown = 0,
  resendLoading = false,
  submitButtonText = "Verify Code & Sign In",
}: OtpInputProps) {
  const [internalCode, setInternalCode] = useState("");
  const inputRef = useRef<TextInput>(null);

  const code = controlledValue !== undefined ? controlledValue : internalCode;

  const handleTextChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, length);
    if (controlledValue === undefined) {
      setInternalCode(clean);
    }
    onChange?.(clean);

    if (clean.length === length) {
      onSubmit(clean);
    }
  };

  const handlePressBoxes = () => {
    inputRef.current?.focus();
  };

  const isComplete = code.length === length;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter 6-digit Verification Code</Text>

      {/* Hidden native input capturing keyboard, paste, and SMS autofill */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        style={styles.hiddenInput}
        caretHidden
        autoFocus
      />

      {/* Visual digit boxes */}
      <Pressable onPress={handlePressBoxes} style={styles.boxRow}>
        {Array.from({ length }).map((_, index) => {
          const char = code[index] || "";
          const isCurrent = index === code.length && code.length < length;
          const isFilled = !!char;

          return (
            <View
              key={index}
              style={[
                styles.box,
                isFilled && styles.boxFilled,
                isCurrent && styles.boxCurrent,
              ]}
            >
              <Text style={[styles.boxText, isFilled && styles.boxTextFilled]}>
                {char}
              </Text>
            </View>
          );
        })}
      </Pressable>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          (!isComplete || loading) && styles.submitBtnDisabled,
        ]}
        disabled={!isComplete || loading}
        onPress={() => {
          if (isComplete && !loading) {
            onSubmit(code);
          }
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>{submitButtonText}</Text>
        )}
      </TouchableOpacity>

      {/* Resend OTP Section */}
      {onResend ? (
        <View style={styles.resendContainer}>
          {resendCooldown > 0 ? (
            <View style={styles.cooldownRow}>
              <Ionicons name="time-outline" size={15} color="#777" />
              <Text style={styles.cooldownText}>
                Resend code in{" "}
                <Text style={{ fontWeight: "bold", color: "#FF8383" }}>
                  {resendCooldown}s
                </Text>
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onResend}
              disabled={resendLoading}
              style={styles.resendBtn}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color="#FF8383" />
              ) : (
                <Text style={styles.resendBtnText}>
                  Didn’t receive code?{" "}
                  <Text style={styles.resendBtnHighlight}>Resend OTP</Text>
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 12,
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: 56,
    opacity: 0,
    zIndex: 2,
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
    zIndex: 1,
  },
  box: {
    width: 46,
    height: 54,
    borderWidth: 2,
    borderColor: "#555",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  boxCurrent: {
    borderColor: "#FF8383",
    borderWidth: 2.5,
    backgroundColor: "#fff5f5",
  },
  boxFilled: {
    borderColor: "#FF8383",
    backgroundColor: "#fff5f5",
  },
  boxText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  boxTextFilled: {
    color: "#111",
  },
  submitBtn: {
    backgroundColor: "#FF8383",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  resendContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cooldownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cooldownText: {
    fontSize: 14,
    color: "#777",
  },
  resendBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendBtnText: {
    fontSize: 14,
    color: "#555",
  },
  resendBtnHighlight: {
    color: "#FF8383",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
