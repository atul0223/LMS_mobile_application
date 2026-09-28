import axios from "axios";
import crypto from "crypto";
import User from "../models/userModel.ts";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** Minimum spacing between OTP emails to one account. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** OTPs are stored hashed so a database read cannot be replayed as a login. */
export const hashOtp = (code: string | number): string =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

const buildHtml = (otp: string) => `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>🔐 Email Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px; border-radius: 6px; text-align: center;">
        ${otp}
      </div>
      <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share it.</p>
    </div>
  `;

/**
 * Issues an OTP to `email` if the per-account cooldown has elapsed.
 *
 * Returns true when a code was sent, false when suppressed by the cooldown.
 * Callers must respond identically either way — a distinguishable response
 * turns this into an account-existence oracle and an email-bombing lever.
 */
const sendOtp = async (email: string): Promise<boolean> => {
  const now = Date.now();

  // Ensure the user's otp field is a valid subdocument object so dot-path updates succeed
  await User.collection.updateOne(
    {
      email,
      $or: [
        { otp: null },
        { otp: { $type: "null" } },
        { otp: { $type: "string" } },
        { otp: { $type: "number" } }
      ]
    },
    {
      $set: {
        otp: {
          code: null,
          createdAt: new Date(),
          attempts: 0,
          nextSendAllowedAt: null
        }
      }
    }
  ).catch(() => {});

  // Atomically claim the send slot: the filter only matches when no cooldown
  // is outstanding, so concurrent requests cannot both pass the check.
  const claimed = await User.findOneAndUpdate(
    {
      email,
      $or: [
        { "otp.nextSendAllowedAt": null },
        { "otp.nextSendAllowedAt": { $exists: false } },
        { "otp.nextSendAllowedAt": { $lte: new Date(now) } }
      ]
    },
    { $set: { "otp.nextSendAllowedAt": new Date(now + OTP_RESEND_COOLDOWN_MS) } },
    { returnDocument: 'after' }
  );

  // No match means either the account does not exist or the cooldown is still
  // running. Both are silent no-ops to the caller.
  if (!claimed) {
    return false;
  }

  const otp = String(crypto.randomInt(100000, 1000000));

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: process.env.MAIL_SENDER_NAME || "LMS",
          email: process.env.MAIL_SENDER_EMAIL
        },
        to: [{ email }],
        subject: "Verification Code",
        htmlContent: buildHtml(otp),
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Brevo API email failed:", {
      status: error?.response?.status,
      data: error?.response?.data,
    });
    // Release the cooldown so a transient provider failure does not lock the
    // user out of requesting a code for the full window.
    await User.updateOne({ email }, { $set: { "otp.nextSendAllowedAt": null } }).catch(() => { });
    throw new Error("Failed to send OTP. Please try again later.");
  }

  // Persist only after the mail provider accepted it, so the stored hash
  // always corresponds to a code the user can actually receive.
  await User.updateOne(
    { email },
    {
      $set: {
        "otp.code": hashOtp(otp),
        "otp.createdAt": new Date(),
        "otp.attempts": 0
      },
    }
  );

  return true;
};

export default sendOtp;
