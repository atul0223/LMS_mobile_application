import type { Request, Response } from 'express';
import User from '../models/userModel.ts'
import sendOtp from '../utils/sendOtp.js';
import generateJWT from '../utils/jwtokengenerator.js';
export const customSignup = async (req: Request, res: Response) => {

    const { username, password, email, fullName, role } = req?.body;
    if ([username, password, email, role].some((f) => !f?.trim())) {
        return res.status(401).json({ message: "fields required" });
    }
    if (!['student', 'teacher'].includes(role)) {
        return res.status(401).json({ message: "invalid role" });
    }
    const existedUser = await User.findOne({ username });
    if (existedUser) {
        return res.status(401).json({ message: "Username already exists" });
    }
    const emailUsed = await User.findOne({ email });
    if (emailUsed) {
        return res.status(401).json({ message: "Email already exists" });
    }
    await User.create({
        username,
        passwordSchema: {
            password,
        },
        email,
        fullName,
        role
    });
    await sendOtp(email)
    return res.status(200).json({
        message: "Successfully registered", requiresOtp: true, emailVerify: true
    });
};
export const verifyOtp = async (req: Request, res: Response) => {
    const { identifier, otp } = req?.body;
    if (!identifier) {
        return res.status(400).json({ message: "please provide unique credential" });
    }
    if (!otp) {
        return res.status(400).json({ message: "please provide unique otp" });
    }

    const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
        return res.status(404).json({ message: "user not found" });
    }
    if (!user.otp?.code || !user.otp?.createdAt) {
        return res.status(400).json({ message: "otp not found or expired" });
    }

    const otpAgeMs = Date.now() - new Date(user.otp.createdAt).getTime();
    const otpExpired = otpAgeMs > 10 * 60 * 1000;
    if (otpExpired) {
        return res.status(400).json({ message: "otp expired" });
    }
    if (otp.length !== 6) {
        return res.status(400).json({ message: "otp must be 6 digits" });
    }
    if (user.otp.code.toString() !== otp.toString()) {
        return res.status(400).json({ message: "invalid otp" });
    }

    const accessToken = generateJWT(user._id, "30d");

    user.otp = null;
    if (user.passwordSchema) {
        user.passwordSchema.attempts = 0; // Reset attempts on successful login
        user.isVerified = true
    }

    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
        message: "Successfully logged in",
        accessToken,
    });
}
export const login = async (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    if (identifier === null || password === null) {
        return res
            .status(401)
            .json({ message: "Username and password are required" });
    }
    const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }]
    });
    if (!user) return res.status(404).json({ message: "User not found" });


    const validateUser = user.passwordSchema?.password === password;
    if (!validateUser) {
        user.passwordSchema?.attemptPasswords.push(password)
        if ((user.passwordSchema?.attempts ?? 0) >= 5) {
            sendOtp(user.email);
            return res
                .status(429)
                .json({ message: "Too many wrong attempts.", requiresOtp: true });
        }
        if (user.passwordSchema) {
            user.passwordSchema.attempts = (user.passwordSchema.attempts ?? 0) + 1;
        }
        await user.save({ validateBeforeSave: false });
        return res.status(401).json({ message: "Incorrect password" });
    }

    if (!user.isVerified) {
        const token = generateJWT(user._id, process.env.EMAILTIME);
        sendOtp(user.email)

        await user.save({ validateBeforeSave: false });
        return res.status(301).json({
            message: "Please verify your email",
            requiresOtp: true,
            emailVerify: true
        });
    }

    if (user.passwordSchema) {
        user.passwordSchema.attempts = 0; // Reset attempts on successful login
    }
    await user.save({ validateBeforeSave: false });
    const accessToken = generateJWT(user._id, "30d");
    return res.status(200).json({
        message: "Successfully logged in",
        accessToken,
    });
}
