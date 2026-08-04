import type { Request, Response } from 'express';
import User from '../models/userModel.ts'
import sendOtp from '../utils/sendOtp.js';
export const customSignup = async (req: Request, res: Response) => {

    const { username, password, email, fullName, role } = req.body;
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