import type { NextFunction, Request, Response } from "express";
import User from "../models/userModel.ts";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

type JwtPayloadWithId = JwtPayload & { id?: string };

const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const authHeader = req.headers.authorization || req.headers.Authorization;
        const bearerToken =
            typeof authHeader === "string" && authHeader.startsWith("Bearer ")
                ? authHeader.slice(7)
                : null;
        const token = bearerToken;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized request — please login first" });
        }
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: "JWT secret is not configured on backend" });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as JwtPayloadWithId;
        const userId = decodedToken?.id;
        if (!userId) {
            return res.status(401).json({ message: "Invalid Access Token" });
        }
        const user = await User.findById(userId).select("_id username fullName profilePic email role isVerified enrolledCources");
        if (!user) {
            return res.status(401).json({ message: "User not found or Invalid Access Token" });
        }
        req.user = user;
        next();
    } catch (error: any) {
        // Never echo the verifier's message — it distinguishes malformed,
        // wrong-signature and expired tokens, which aids forgery attempts.
        const expired = error?.name === "TokenExpiredError";
        return res.status(401).json({
            message: expired ? "Access token expired" : "Invalid access token"
        });
    }
};
export default verifyUser;
