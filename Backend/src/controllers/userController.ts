import type { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../models/userModel.ts'
import sendOtp, { OTP_MAX_ATTEMPTS, OTP_TTL_MS, hashOtp } from '../utils/sendOtp.ts';
import generateJWT from '../utils/jwtokengenerator.ts';
import asyncHandler from '../utils/asyncHandler.ts';

/** Failed password attempts tolerated before the account is locked. */
const MAX_PASSWORD_ATTEMPTS = 5;
/** How long password auth stays refused once the threshold is crossed. */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/**
 * Uniform failure for bad credentials. Distinguishing "no such user" from
 * "wrong password" lets an attacker enumerate accounts, so both land here.
 */
const INVALID_CREDENTIALS = "Invalid credentials";

const timingSafeEqual = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
};

export const customSignup = asyncHandler(async (req: Request, res: Response) => {

    const { username, password, email, fullName, role } = req?.body;
    if ([username, password, email, role].some((f) => typeof f !== "string" || !f.trim())) {
        return res.status(400).json({ message: "fields required" });
    }
    if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: "invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const existing = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] }).select("_id");

    // Responding identically whether or not the identifier is taken keeps
    // signup from confirming which emails and usernames are registered.
    if (!existing) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username: normalizedUsername,
            passwordSchema: {
                password: hashedPassword,
            },
            email: normalizedEmail,
            fullName: fullName ? String(fullName).trim() : normalizedUsername,
            role
        });
        // The account is already persisted, so a mail-provider failure must not
        // fail the request — that would report an error for a registration that
        // actually succeeded, and the user could never reach verification.
        // They can trigger a fresh code by signing in.
        await sendOtp(normalizedEmail).catch((error) => {
            console.error("Signup OTP delivery failed:", error?.message);
        });
    }

    return res.status(200).json({
        message: "If the details are available, a verification code has been sent.",
        requiresOtp: true,
        emailVerify: true
    });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otp } = req?.body;
    if (typeof identifier !== "string" || !identifier.trim()) {
        return res.status(400).json({ message: "please provide unique credential" });
    }
    if (typeof otp !== "string" && typeof otp !== "number") {
        return res.status(400).json({ message: "please provide unique otp" });
    }

    const submitted = String(otp).trim();
    const cleanIdentifier = identifier.trim();
    const invalidOtp = { message: "invalid or expired otp" };

    const user = await User.findOne({
        $or: [{ email: cleanIdentifier.toLowerCase() }, { username: cleanIdentifier }]
    });

    // Unknown identifier is reported the same as a bad code.
    if (!user || !user.otp?.code || !user.otp?.createdAt) {
        return res.status(400).json(invalidOtp);
    }

    // A code that has already absorbed its attempt budget is dead even if the
    // caller eventually guesses it — this is what bounds the 10^6 search space.
    if ((user.otp.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ message: "too many attempts, request a new code" });
    }

    const otpAgeMs = Date.now() - new Date(user.otp.createdAt).getTime();
    if (otpAgeMs > OTP_TTL_MS) {
        return res.status(400).json(invalidOtp);
    }

    if (!/^\d{6}$/.test(submitted) || !timingSafeEqual(hashOtp(submitted), user.otp.code)) {
        // Count the miss atomically so parallel guesses cannot race past the cap.
        await User.updateOne({ _id: user._id }, { $inc: { "otp.attempts": 1 } });
        return res.status(400).json(invalidOtp);
    }

    const accessToken = generateJWT(user._id, "30d");

    // Single use: clear the code so a replay of the same value fails.
    user.otp = null;
    user.isVerified = true;
    if (user.passwordSchema) {
        user.passwordSchema.attempts = 0;
        user.passwordSchema.lockedUntil = null;
    }

    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
        message: "Successfully logged in",
        accessToken,
    });
});

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier } = req?.body;
    if (typeof identifier !== "string" || !identifier.trim()) {
        return res.status(400).json({ message: "Identifier (email or username) is required" });
    }

    const clean = identifier.trim();
    const user = await User.findOne({
        $or: [{ email: clean.toLowerCase() }, { username: clean }]
    });

    if (user && user.email) {
        await sendOtp(user.email).catch((err) => {
            console.error("Direct OTP delivery failed:", err?.message);
        });
    }

    // Always respond uniformly to avoid account enumeration
    return res.status(200).json({
        message: "If the account exists, a verification code has been sent.",
        requiresOtp: true,
        emailVerify: true,
    });
});

/**
 * Returns the authenticated user.
 *
 * `verifyUser` has already narrowed the document to non-sensitive fields, so
 * this reflects that selection rather than re-querying.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized request" });
    }
    return res.status(200).json({ user: req.user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    if (
        typeof identifier !== "string" || !identifier.trim() ||
        typeof password !== "string" || !password
    ) {
        return res
            .status(400)
            .json({ message: "Username and password are required" });
    }
    const cleanIdentifier = identifier.trim();
    const user = await User.findOne({
        $or: [{ email: cleanIdentifier.toLowerCase() }, { username: cleanIdentifier }]
    });
    if (!user) return res.status(401).json({ message: INVALID_CREDENTIALS });

    // Refuse before touching the password so a locked account cannot be probed.
    const lockedUntil = user.passwordSchema?.lockedUntil;
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
        return res.status(429).json({
            message: "Account temporarily locked. Try again later.",
            retryAfterSeconds: Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000)
        });
    }

    const storedPassword = user.passwordSchema?.password || "";
    let validateUser = false;

    // Check if stored password is a bcrypt hash
    if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$")) {
        validateUser = await bcrypt.compare(password, storedPassword).catch(() => false);
    } else {
        // Fallback for legacy plain-text test accounts and upgrade
        validateUser = timingSafeEqual(storedPassword, password);
        if (validateUser) {
            const rehashed = await bcrypt.hash(password, 10);
            if (user.passwordSchema) {
                user.passwordSchema.password = rehashed;
            }
        }
    }
    if (!validateUser) {
        if (user.passwordSchema) {
            const attempts = (user.passwordSchema.attempts ?? 0) + 1;
            user.passwordSchema.attempts = attempts;

            // Increment first, then test — checking the stale count let the
            // threshold be crossed without ever engaging the lock.
            if (attempts >= MAX_PASSWORD_ATTEMPTS) {
                user.passwordSchema.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
                user.passwordSchema.attempts = 0;
                await user.save({ validateBeforeSave: false });

                // Cooldown inside sendOtp caps mail volume regardless of how
                // often an attacker drives the account into lockout.
                await sendOtp(user.email).catch(() => { });
                return res
                    .status(429)
                    .json({ message: "Account temporarily locked. Try again later." });
            }
        }
        await user.save({ validateBeforeSave: false });
        return res.status(401).json({ message: INVALID_CREDENTIALS });
    }

    if (!user.isVerified) {
        await sendOtp(user.email).catch(() => { });
        // 403, not 301 — a redirect status makes clients follow rather than
        // surface the verification requirement.
        return res.status(403).json({
            message: "Please verify your email",
            requiresOtp: true,
            emailVerify: true
        });
    }

    if (user.passwordSchema) {
        user.passwordSchema.attempts = 0; // Reset attempts on successful login
        user.passwordSchema.lockedUntil = null;
    }
    await user.save({ validateBeforeSave: false });
    const accessToken = generateJWT(user._id, "30d");
    return res.status(200).json({
        message: "Successfully logged in",
        accessToken,
    });
});
