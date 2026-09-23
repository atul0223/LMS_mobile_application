import React, { useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from "react-native";

type OtpInputProps = {
  length?: number;
  onSubmit?: (otp: string) => void;
};

export default function OtpInput({ length = 6, onSubmit }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(TextInput | null)[]>([]);

  const focusPrev = (index: number) => {
    if (index > 0) inputs.current[index - 1]?.focus();
  };

  const handleChange = (text: string, index: number) => {
    // keep only digits, and take the last typed char (handles fast typing)
    const value = text.replace(/[^0-9]/g, "").slice(-1);

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value) {
      if (index < length - 1) inputs.current[index + 1]?.focus();
    } else {
      // box was cleared by backspace -> step back
      focusPrev(index);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    // only fires usefully when the box is already empty; when it has a digit
    // handleChange does the stepping back instead
    if (e.nativeEvent.key === "Backspace" && !digits[index]) {
      const next = [...digits];
      if (index > 0) next[index - 1] = "";
      setDigits(next);
      focusPrev(index);
    }
  };

  const otp = digits.join("");
  const isComplete = otp.length === length;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter the 6 digit OTP</Text>

      <View style={styles.boxRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            style={[styles.box, digit ? styles.boxFilled : null]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.myButton, !isComplete && styles.myButtonDisabled]}
        disabled={!isComplete}
        onPress={() => onSubmit?.(otp)}
      >
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: "5%",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  box: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: "#555",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    color: "#555",
  },
  boxFilled: {
    borderColor: "#FF8383",
  },
  myButton: {
    backgroundColor: "#FF8383",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: "15%",
  },
  myButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
