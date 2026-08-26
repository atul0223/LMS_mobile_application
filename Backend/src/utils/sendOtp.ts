import axios from "axios";
import User from "../models/userModel.ts";

const sendOtp = async (email: string) => {
  const otp = Math.floor(100000 + Math.random() * 900000);

  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>🔐 Email Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px; border-radius: 6px; text-align: center;">
        ${otp}
      </div>
      <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share it.</p>
    </div>
  `;

  try {
    
    
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "LMS", email: "atulbramhan@gmail.com" },
        to: [{ email }],
        subject: "Verification Code",
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    await User.findOneAndUpdate(
      { email },
      {
        $set: {
          otp:{
            code : otp,
            createdAt:new Date(Date.now()),
          },
         
        },
      }
    );
  } catch (error: any) {
  console.error("Brevo API email failed:", {
    status: error?.response?.status,
    data: error?.response?.data,
    headers: error?.response?.headers,
  });
  throw new Error("Failed to send OTP. Please try again later.");
}
};

export default sendOtp;