import Checkbox from "expo-checkbox";
import BackgroundSVG from "../../../assets/images/background.svg";
import EmailIconSVG from "../../../assets/images/emailIcon.svg";
import LockIconSVG from "../../../assets/images/lock.svg";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import OtpInput from "../../components/OtpInput";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";

export default function Login() {
  const [isChecked, setChecked] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP resend state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { loginUser, verifyUserOtp, sendUserOtp } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email or username");
      showToast("Email or username is required", "error");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      showToast("Password is required", "error");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await loginUser({
        identifier: identifier.trim(),
        password,
      });

      if (res.requiresOtp || res.emailVerify) {
        setNeedsOtp(true);
        startCooldown(60);
        showToast("Verification code sent to your email ✉️", "info");
      } else if (res.accessToken) {
        showToast("Welcome back!", "success");
        router.replace("/(tabs)/index");
      }
    } catch (err: any) {
      if (err?.data?.requiresOtp || err?.data?.emailVerify) {
        setNeedsOtp(true);
        startCooldown(60);
        showToast("Please enter verification OTP sent to your email", "info");
      } else {
        const msg = err.message || "Failed to log in. Please check credentials.";
        setError(msg);
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerOtp = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email or username first");
      showToast("Email or username is required", "error");
      return;
    }

    try {
      setResendLoading(true);
      setError(null);
      const res = await sendUserOtp(identifier.trim());
      setNeedsOtp(true);
      startCooldown(60);
      showToast(res.message || "Verification code sent to your email ✉️", "info");
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    if (!identifier.trim()) {
      setError("Please provide your email or username");
      showToast("Identifier is required", "error");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyUserOtp({
        identifier: identifier.trim(),
        otp,
      });

      showToast("Successfully authenticated! 🎉", "success");
      router.replace("/(tabs)/index");
    } catch (err: any) {
      const msg = err.message || "Invalid or expired OTP";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <BackgroundSVG
            style={[{ zIndex: -1, marginTop: "-38%" }]}
            width="100%"
          />
          <View style={styles.bottomContainer}>
            <Text style={styles.heading}>
              {needsOtp ? "Verify Otp" : "Login"}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color="#d93025"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {needsOtp ? (
              <View style={{ marginTop: "10%" }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Email or Username</Text>
                  <View style={styles.inputWrapper}>
                    <EmailIconSVG width={20} height={20} style={styles.icon} />
                    <TextInput
                      placeholder="demo@email.com or username"
                      placeholderTextColor="#999"
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        setError(null);
                      }}
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <Text style={styles.subtext}>
                  Enter the 6-digit verification code sent to{" "}
                  <Text style={{ fontWeight: "bold", color: "#333" }}>
                    {identifier || "your email"}
                  </Text>
                </Text>

                <OtpInput
                  loading={loading}
                  onSubmit={handleOtpSubmit}
                  onResend={handleTriggerOtp}
                  resendCooldown={resendCooldown}
                  resendLoading={resendLoading}
                  submitButtonText="Verify Code & Sign In"
                />

                <TouchableOpacity
                  onPress={() => {
                    setNeedsOtp(false);
                    setError(null);
                  }}
                  style={{ marginTop: 25, alignSelf: "center", padding: 8 }}
                >
                  <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                    ← Back to Password Login
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: "12%" }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email or Username</Text>
                  <View style={styles.inputWrapper}>
                    <EmailIconSVG width={20} height={20} style={styles.icon} />
                    <TextInput
                      placeholder="demo@email.com or username"
                      placeholderTextColor="#999"
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        setError(null);
                      }}
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <LockIconSVG width={20} height={20} style={styles.icon} />
                    <TextInput
                      placeholder="**********"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        setError(null);
                      }}
                      style={styles.textInput}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#777"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.checkboxContainer2}>
                    <View style={styles.checkboxContainer}>
                      <Checkbox
                        value={isChecked}
                        onValueChange={setChecked}
                        color={isChecked ? "#FF8383" : undefined}
                      />
                      <Text style={styles.checkboxLabel}>Remember me</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Forgot Password",
                          "You can verify and log in using an OTP code sent to your registered email address."
                        )
                      }
                    >
                      <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                        Forgot password?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      height: "100%",
                      flex: 1,
                      gap: 12,
                      width: "100%",
                      marginTop: "16%",
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.myButton, loading && styles.buttonDisabled]}
                      onPress={handleLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Login</Text>
                      )}
                    </TouchableOpacity>

                    {/* Direct OTP Trigger / Verification Button */}
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setError(null);
                        setNeedsOtp(true);
                      }}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color="#FF8383"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.secondaryButtonText}>
                        Have a verification code? Verify with OTP
                      </Text>
                    </TouchableOpacity>

                    <View
                      style={{
                        flexDirection: "row",
                        width: "100%",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 10,
                      }}
                    >
                      <Text style={{ color: "#555" }}>Don’t have an Account ?</Text>
                      <TouchableOpacity onPress={() => router.replace("/Signup")}>
                        <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                          Signup
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bottomContainer: {
    flex: 1,
    padding: 20,
    width: "100%",
    height: "100%",
    marginTop: "-20%",
  },
  myButton: {
    backgroundColor: "#FF8383",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF8383",
    backgroundColor: "#fff5f5",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#FF8383",
    fontSize: 14,
    fontWeight: "600",
  },
  heading: {
    fontSize: 35,
    fontWeight: "600",
    color: "#555",
    textDecorationLine: "underline",
  },
  subtext: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "#555",
    paddingHorizontal: 5,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
  },
  inputGroup: {
    marginBottom: 20,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginLeft: 3,
    gap: 8,
    alignItems: "center",
  },
  checkboxContainer2: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#555",
  },
  errorBox: {
    backgroundColor: "#ffe5e5",
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#FF8383",
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "#d93025",
    fontSize: 13,
    flex: 1,
  },
});
