import Checkbox from "expo-checkbox";
import BackgroundSVG from "../../../assets/images/background.svg";
import EmailIconSVG from "../../../assets/images/emailIcon.svg";
import LockIconSVG from "../../../assets/images/lock.svg";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

type AuthMode = "login" | "forgot_step1" | "forgot_step2";

export default function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isChecked, setChecked] = useState(false);
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

  // Standard password login
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
        setAuthMode("forgot_step2");
        startCooldown(60);
        showToast("Verification code sent to your email ✉️", "info");
      } else if (res.accessToken) {
        showToast("Welcome back!", "success");
        router.replace("/(tabs)/explore");
      }
    } catch (err: any) {
      if (err?.data?.requiresOtp || err?.data?.emailVerify) {
        setAuthMode("forgot_step2");
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

  // Step 1: Submit email to request OTP
  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email or username");
      showToast("Email or username is required", "error");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await sendUserOtp(identifier.trim());
      setAuthMode("forgot_step2");
      startCooldown(60);
      showToast(res.message || "Verification code sent to your email ✉️", "info");
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Resend code trigger from Step 2
  const handleResendOtp = async () => {
    if (!identifier.trim()) {
      setError("Identifier is missing");
      return;
    }

    try {
      setResendLoading(true);
      setError(null);
      const res = await sendUserOtp(identifier.trim());
      startCooldown(60);
      showToast(res.message || "New code sent to your email ✉️", "info");
    } catch (err: any) {
      const msg = err.message || "Failed to resend code";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Submit OTP to verify and log in
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
      router.replace("/(tabs)/explore");
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
            {/* Header Title */}
            <Text style={styles.heading}>
              {authMode === "login"
                ? "Login"
                : authMode === "forgot_step1"
                ? "Forgot Password"
                : "Verify Otp"}
            </Text>

            {/* Error Message Box */}
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

            {/* ----------------- FORGOT PASSWORD STEP 1: ENTER EMAIL ----------------- */}
            {authMode === "forgot_step1" && (
              <View style={{ marginTop: "10%" }}>
                <Text style={styles.subtext}>
                  Enter your registered email address or username. We will send you a
                  6-digit verification code.
                </Text>

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
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.myButton, loading && styles.buttonDisabled, { marginTop: 24 }]}
                  onPress={handleRequestOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Submit</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    setAuthMode("login");
                  }}
                  style={{ marginTop: 25, alignSelf: "center", padding: 8 }}
                >
                  <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                    ← Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ----------------- FORGOT PASSWORD STEP 2: ENTER OTP ----------------- */}
            {authMode === "forgot_step2" && (
              <View style={{ marginTop: "10%" }}>
                <Text style={styles.subtext}>
                  Enter the 6-digit verification code sent to{" "}
                  <Text style={{ fontWeight: "bold", color: "#333" }}>
                    {identifier || "your email"}
                  </Text>
                </Text>

                <OtpInput
                  loading={loading}
                  onSubmit={handleOtpSubmit}
                  onResend={handleResendOtp}
                  resendCooldown={resendCooldown}
                  resendLoading={resendLoading}
                  submitButtonText="Verify Code & Sign In"
                />

                <View style={{ marginTop: 20, alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setError(null);
                      setAuthMode("forgot_step1");
                    }}
                    style={{ padding: 6 }}
                  >
                    <Text style={{ color: "#777", fontSize: 13 }}>
                      Wrong email/username?{" "}
                      <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                        Change
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setError(null);
                      setAuthMode("login");
                    }}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                      ← Back to Login
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ----------------- STANDARD LOGIN ----------------- */}
            {authMode === "login" && (
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

                    {/* Forgot password link -> triggers Step 1 */}
                    <TouchableOpacity
                      onPress={() => {
                        setError(null);
                        setAuthMode("forgot_step1");
                      }}
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
                      marginTop: "18%",
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
                      <TouchableOpacity onPress={() => router.replace("/(auth)/Signup")}>
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
  heading: {
    fontSize: 35,
    fontWeight: "600",
    color: "#555",
    textDecorationLine: "underline",
  },
  subtext: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
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
