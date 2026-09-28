import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Checkbox from "expo-checkbox";
import { Ionicons } from "@expo/vector-icons";
import LockIconSVG from "../../../assets/images/lock.svg";
import EmailIconSVG from "../../../assets/images/emailIcon.svg";
import BackgroundSVG from "../../../assets/images/background.svg";
import UserSVG from "../../../assets/images/user.svg";
import OtpInput from "../../components/OtpInput";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";

export default function Signup() {
  const [isChecked, setChecked] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP resend state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();
  const { signupUser, verifyUserOtp, sendUserOtp } = useAuth();
  const { showToast } = useToast();

  React.useEffect(() => {
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

  const roleData = [
    { label: "Student 🎓", value: "student" },
    { label: "Teacher 👨‍🏫", value: "teacher" },
  ];

  const handleSignup = async () => {
    if (!username.trim()) {
      setError("Please choose a username");
      showToast("Username is required", "error");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      showToast("Valid email is required", "error");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      showToast("Password too short (min 6 characters)", "error");
      return;
    }
    if (!isChecked) {
      setError("Please agree to the terms & conditions");
      showToast("Terms & conditions must be accepted", "error");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await signupUser({
        username: username.trim(),
        fullName: fullName.trim() || username.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if (res.requiresOtp || res.emailVerify) {
        setNeedsOtp(true);
        startCooldown(60);
        showToast("Verification OTP sent to your email ✉️", "info");
      } else {
        showToast("Account created successfully! Please log in.", "success");
        router.replace("/(auth)/Login");
      }
    } catch (err: any) {
      const msg = err.message || "Registration failed. Try again.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      setError("Please provide your email address");
      showToast("Email is required", "error");
      return;
    }

    try {
      setResendLoading(true);
      setError(null);
      const res = await sendUserOtp(email.trim().toLowerCase());
      startCooldown(60);
      showToast(res.message || "Verification code sent to your email ✉️", "info");
    } catch (err: any) {
      const msg = err.message || "Failed to resend verification code";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    try {
      setLoading(true);
      setError(null);
      await verifyUserOtp({
        identifier: email.trim().toLowerCase(),
        otp,
      });

      showToast("Email verified! Welcome to LMS 🎉", "success");
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
            style={[{ zIndex: -1, marginTop: "-55%" }]}
            width="100%"
          />
          <View>
            <Text style={styles.heading}>
              {needsOtp ? "Verify Otp" : "Sign up"}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#d93025" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {needsOtp ? (
              <View style={styles.contentPadding}>
                <Text style={styles.subtext}>
                  Enter the 6-digit verification code sent to{" "}
                  <Text style={{ fontWeight: "bold", color: "#333" }}>{email}</Text>
                </Text>

                <OtpInput
                  loading={loading}
                  onSubmit={handleOtpSubmit}
                  onResend={handleResendOtp}
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
                    ← Edit Signup Details
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.contentPadding}>
                <View style={[styles.inputGroup, styles.row]}>
                  <View style={styles.usernameCol}>
                    <Text style={styles.label}>Username</Text>
                    <View style={styles.inputWrapper}>
                      <UserSVG width={20} height={20} style={styles.icon} />
                      <TextInput
                        placeholder="Anonymous"
                        placeholderTextColor="#999"
                        value={username}
                        onChangeText={(val) => {
                          setUsername(val);
                          setError(null);
                        }}
                        autoCapitalize="none"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                  <View style={styles.roleCol}>
                    <Text style={styles.label}>Role</Text>
                    <Dropdown
                      style={styles.dropdown}
                      placeholderStyle={styles.dropdownText}
                      selectedTextStyle={styles.dropdownText}
                      data={roleData}
                      labelField="label"
                      valueField="value"
                      placeholder="Role"
                      value={role}
                      onChange={(item) => {
                        setRole(item.value as "student" | "teacher");
                      }}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <UserSVG width={20} height={20} style={styles.icon} />
                    <TextInput
                      placeholder="John Doe"
                      placeholderTextColor="#999"
                      value={fullName}
                      onChangeText={(val) => setFullName(val)}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <EmailIconSVG width={20} height={20} style={styles.icon} />
                    <TextInput
                      placeholder="demo@email.com"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        setError(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <LockIconSVG width={20} height={20} style={styles.icon} />
                    <TextInput
                      placeholder="At least 6 characters"
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
                      <Text style={styles.checkboxLabel}>
                        Accept terms & conditions
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      height: "100%",
                      flex: 1,
                      gap: 10,
                      width: "100%",
                      marginTop: "15%",
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.myButton, loading && styles.buttonDisabled]}
                      onPress={handleSignup}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Sign up</Text>
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
                      <Text style={{ color: "#555" }}>
                        Already have an Account ?
                      </Text>
                      <TouchableOpacity onPress={() => router.replace("/(auth)/Login")}>
                        <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                          Login
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
  contentPadding: {
    width: "100%",
    flex: 1,
    padding: "7%",
    marginTop: "5%",
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
    fontWeight: "bold",
    color: "#555",
    fontSize: 35,
    paddingHorizontal: "7%",
    marginTop: -58,
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
    marginBottom: 18,
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
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  usernameCol: {
    flexBasis: "56%",
    flexGrow: 0,
    flexShrink: 1,
  },
  roleCol: {
    flexBasis: "42%",
    flexGrow: 0,
    flexShrink: 1,
  },
  dropdown: {
    height: 38,
    borderBottomWidth: 2,
    borderColor: "#555",
    paddingHorizontal: 5,
  },
  dropdownText: {
    fontSize: 15,
    color: "#555",
  },
  errorBox: {
    backgroundColor: "#ffe5e5",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: "7%",
    marginTop: 10,
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
