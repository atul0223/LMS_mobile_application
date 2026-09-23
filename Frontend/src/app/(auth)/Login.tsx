import Checkbox from "expo-checkbox";
import BackgroundSVG from '../../../assets/images/background.svg';
import EmailIconSVG from '../../../assets/images/emailIcon.svg';
import LockIconSVG from '../../../assets/images/lock.svg';
import { useState } from "react";
import {
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
import OtpInput from "../../components/OtpInput";

export default function Login() {
  const [isChecked, setChecked] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);

  return (
    <KeyboardAvoidingView
          style={{ flex: 1 }}
          // iOS needs 'padding', Android usually works better with 'height' or no behavior
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        
        <BackgroundSVG
          style={[
            { zIndex: -1 ,  marginTop: "-38%"},
           
          ]} width="100%" 
        />
        <View style={styles.bottomContainer}>
          <Text style={styles.heading}>{needsOtp ? "Verify Otp" : "Login"}</Text>
          {needsOtp ? (
            <View style={{ marginTop: "13%" }}>
              <OtpInput
                onSubmit={(otp) => {
                  console.log("otp", otp);
                }}
              />
            </View>
          ) : (
          <View style={{ marginTop: "13%" }}>
            <View style={styles.inputGroup}>
              {/* 1. Your "span" (Label) on top */}
              <Text style={styles.label}>Email</Text>

              {/* 2. Your input box with the icon */}
              <View style={styles.inputWrapper}>
                <EmailIconSVG
                  width={20} height={20} style={styles.icon}
                />
                <TextInput
                  placeholder="demo@email.com"
                  style={styles.textInput}
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              {/* 1. Your "span" (Label) on top */}
              <Text style={styles.label}>Password</Text>

              {/* 2. Your input box with the icon */}
              <View style={styles.inputWrapper}>
                <LockIconSVG
                  width={20} height={20} style={styles.icon}
                />
                <TextInput
                  placeholder="**********"
                  style={styles.textInput}
                  secureTextEntry={true}
                />
              </View>
              <View style={styles.checkboxContainer2}>
                <View style={styles.checkboxContainer}>
                  <Checkbox
                    value={isChecked}
                    onValueChange={setChecked}
                    color={isChecked ? "#FF8383" : undefined} // Turns blue when checked
                  />
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </View>
                <Text style={{ color: "#FF8383", fontWeight: "bold" }}>
                  Forgot password?
                </Text>
              </View>
              <View
                style={{
                  height: "100%",
                  flex: 1,
                  gap: 10,
                  width: "100%",
                  marginTop: "25%",
                }}
              >
                <TouchableOpacity style={styles.myButton}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    width: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 5,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  heading: {
    fontSize: 35,
    fontWeight: "600",
    color: "#555",
    textDecorationLine: "underline",
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
    gap: 5,
  },
  checkboxContainer2: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#555",
  },
});
